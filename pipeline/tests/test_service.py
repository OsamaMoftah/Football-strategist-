import json
import time
import pytest
from fastapi.testclient import TestClient
from pipeline.service.app import create_app
from pipeline.service.jobs import Jobs, Limits


def wait_for(client, job, expected):
    headers = {"Authorization": f"Bearer {job['token']}"}
    for _ in range(200):
        response = client.get(f"/jobs/{job['id']}", headers=headers)
        if response.json()["status"] == expected:
            return response.json()
        time.sleep(0.01)
    raise AssertionError(response.json())


@pytest.fixture
def client(tmp_path):
    worker = tmp_path / "worker.py"
    worker.write_text(
        "import sys,json,pathlib,time\np=pathlib.Path(sys.argv[1]);print(json.dumps({'frame':3,'total':10}),flush=True);time.sleep(.05);(p/'analysis.json').write_text(json.dumps({'schemaVersion':1,'processing':{'engine':'test'},'frames':[]}))"
    )
    import sys

    jobs = Jobs(
        tmp_path / "jobs",
        limits=Limits(max_bytes=1000),
        command=lambda directory: [sys.executable, str(worker), str(directory)],
        validate=lambda path: None,
    )
    with TestClient(create_app(jobs)) as client:
        yield client, jobs


def submit(client, content=b"video"):
    created = client.post("/jobs", json={"name": "test.mp4"})
    assert created.status_code == 202, created.text
    job = created.json()
    response = client.put(
        f"/jobs/{job['id']}",
        content=content,
        headers={
            "Content-Type": "video/mp4",
            "Authorization": f"Bearer {job['token']}",
        },
    )
    assert response.status_code == 202, response.text
    return job


def test_job_lifecycle_is_private_and_upload_is_deleted_after_processing(client):
    client, jobs = client
    job = submit(client)
    assert client.get(f"/jobs/{job['id']}").status_code == 404
    assert (
        client.get(
            f"/jobs/{job['id']}", headers={"Authorization": "Bearer wrong"}
        ).status_code
        == 404
    )
    completed = wait_for(client, job, "complete")
    assert completed["completed"] == 10
    response = client.get(
        f"/jobs/{job['id']}/result", headers={"Authorization": f"Bearer {job['token']}"}
    )
    assert response.status_code == 200 and response.json()["schemaVersion"] == 1
    assert not (jobs.root / job["id"] / "source.mp4").exists()
    assert str(jobs.root) not in json.dumps(completed)


def test_upload_bounds_and_media_type_are_enforced_before_queueing(client):
    client, jobs = client
    for content, media, code in [
        (b"x" * 1001, "video/mp4", 413),
        (b"bad", "text/plain", 415),
    ]:
        job = client.post("/jobs", json={"name": "test.mp4"}).json()
        response = client.put(
            f"/jobs/{job['id']}",
            content=content,
            headers={"Content-Type": media, "Authorization": f"Bearer {job['token']}"},
        )
        assert response.status_code == code

    assert len(list(jobs.root.iterdir())) == 0


def test_cancel_removes_files_and_never_returns_partial_results(client):
    client, jobs = client
    job = submit(client)
    headers = {"Authorization": f"Bearer {job['token']}"}
    assert client.delete(f"/jobs/{job['id']}", headers=headers).status_code == 200
    assert client.get(f"/jobs/{job['id']}/result", headers=headers).status_code == 409
    assert (
        client.get(f"/jobs/{job['id']}", headers=headers).json()["status"]
        == "cancelled"
    )
    assert not (jobs.root / job["id"]).exists()


def test_queue_saturation_and_expiry_release_files(tmp_path):
    jobs = Jobs(
        tmp_path, limits=Limits(max_jobs=1, ttl_seconds=1), validate=lambda _: None
    )
    job = jobs.reserve("test.mp4")
    with pytest.raises(RuntimeError):
        jobs.reserve("other.mp4")
    jobs.expire(now=job.created + 2)
    assert not (tmp_path / job.id).exists()
    assert jobs.reserve("next.mp4")
    jobs.close()


def test_two_phase_upload_requires_job_token(client):
    client, jobs = client
    created = client.post("/jobs", json={"name": "clip.mp4"})
    assert created.status_code == 202
    job = created.json()
    assert (
        client.put(
            f"/jobs/{job['id']}",
            content=b"video",
            headers={"Content-Type": "video/mp4"},
        ).status_code
        == 404
    )
    response = client.put(
        f"/jobs/{job['id']}",
        content=b"video",
        headers={
            "Content-Type": "video/mp4",
            "Authorization": f"Bearer {job['token']}",
        },
    )
    assert response.status_code == 202
    wait_for(client, job, "complete")


def test_another_job_token_cannot_read_or_cancel_a_job(client):
    client, jobs = client
    first = client.post("/jobs", json={"name": "first.mp4"}).json()
    second = client.post("/jobs", json={"name": "second.mp4"}).json()
    headers = {"Authorization": f"Bearer {second['token']}"}
    assert client.get(f"/jobs/{first['id']}", headers=headers).status_code == 404
    assert client.delete(f"/jobs/{first['id']}", headers=headers).status_code == 404


def test_decode_failure_is_terminal_and_source_is_removed(client):
    client, jobs = client

    def invalid(_):
        raise ValueError("The server could not decode this clip.")

    jobs.validate = invalid
    job = submit(client)
    failed = wait_for(client, job, "failed")
    assert "decode" in failed["error"]
    assert not (jobs.root / job["id"] / "source.mp4").exists()
    assert (
        client.get(
            f"/jobs/{job['id']}/result",
            headers={"Authorization": f"Bearer {job['token']}"},
        ).status_code
        == 409
    )


def test_streamed_body_is_bounded_even_without_content_length(client):
    client, jobs = client
    job = client.post("/jobs", json={"name": "stream.mp4"}).json()
    response = client.put(
        f"/jobs/{job['id']}",
        content=iter([b"x" * 600, b"x" * 600]),
        headers={
            "Content-Type": "video/mp4",
            "Authorization": f"Bearer {job['token']}",
        },
    )
    assert response.status_code == 413
    assert not (jobs.root / job["id"]).exists()
