# Zipup CLI
Zipup CLI is a command-line tool used to deploy build artifacts to Zipup Cloud. It helps you package your application, apply deployment rules, and securely upload artifacts to the Zipup platform.

👉 Learn more about Zipup Cloud here: [zipup cloud](https://zipup.dev)

## What it does

Zipup CLI handles the full deployment flow:

📦 Builds and packages your application artifact
🚫 Applies ignore rules to exclude unnecessary files
🔐 Signs artifacts for integrity verification
☁️ Uploads the artifact to Zipup Cloud
📊 Does a health check of the deployment

## Installation
Install  the zipup-cli globally

```bash
npm i -g zipup-cli
```

## Usage

```bash
zipup deploy --build-folder .
```


## Configuration Sources

Zipup supports three configuration sources:
- CLI flags (highest priority)
- Environment variables
- Config file (zipup.config.json)

## Configuration Matrix 

| **CLI**        | **FILE**    | **ENV**          | **Merge Behavior** | **Usecase**                                                                                           |
|----------------|-------------|------------------|--------------------|-------------------------------------------------------------------------------------------------------|
| --host         | host        | ZIPUP_HOST       | Replace            | Defines zipup admin console url, where deployment request is sent. (like https://admin.zipup.dev)     |
| --app-key      | appKey      | ZIPUP_APP_KEY    | Replace            | Identifies the app for which artifact is being deployed.                                              |
| --secret-key   | secretKey   | ZIPUP_SECRET_KEY | Replace            | Signs the deployment artifact for integrity verification on the server.                               |
| --build-folder | buildFolder | -                | Replace            | Defines the directory to be packaged and deployed as the build artifact.                              |
| --ignore       | ignore      | -                | Merge              | Specifies glob patterns for files excluded from the deployment artifact. We use picomatch internally. |

## Resolution Rules

- **Replace behavior**: Values are resolved with priority CLI > ENV > FILE. For example, if buildFolder is defined in both zipup.config.json and CLI flags, the CLI value takes precedence.
- **Merge behavior**: Some fields (e.g., ignore) are merged across sources instead of being replaced.
- In CI/CD environments, appKey and secretKey should be supplied through environment variables.