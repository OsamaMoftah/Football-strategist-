# Security

The current application has no authentication service or clip upload endpoint. Video inference runs in a browser worker; page and static-asset traffic still reaches the hosting provider. User clips/results are not persisted by the app.

Do not disclose credentials, private footage or customer details in public issues. For a suspected vulnerability, use GitHub's private vulnerability reporting if enabled, or contact the repository owner privately through their GitHub profile.

Dependency, worker, media-decoder and browser vulnerabilities may affect this project. Keep dependencies maintained and test cancellation, input limits and export behavior after changes. No formal penetration test or security certification has been performed.
