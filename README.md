# rancher-alarms

Send notifications when something goes wrong in rancher

### PLEASE NOTE: Project is under a heavy development

## Features
 - Will kick your ass when service state is not okay
 - Various notification mechanisms
   - email
   - and more will be later...
 - Configure notification mechanisms globally or on a per service level

## Run in Docker

```
docker run \
    -d \
    -e CONFIG_FILE=/etc/rancher-alarms/config.json \
    -v $(pwd)/config.json:/etc/rancher-alarms/config.json \
    --name rancher-alarms \
    ndelitski/rancher-alarms:0.1.0
```

### Docker compose

```yml
rancher-alarms:
  image: ndelitski/rancher-alarms:0.1.0
  environment:
    RANCHER_ADDRESS: rancher.yourdomain.com[:port]
    RANCHER_ACCESS_KEY: AccessKEY
    RANCHER_SECRET_KEY: SECRETkey
    RANCHER_PROJECT_ID: i8a
    ALARM_EMAIL_ADDRESSES: arya@stark.com,john@snow.com
    ALARM_EMAIL_USER: alarm@nightwatch.com
    ALARM_EMAIL_PASS: nightWatch
    ALARM_EMAIL_SMTP_HOST: smtp.snow.com
    ALARM_EMAIL_FROM: 'Alarm of a Night Watch <alarm@nightwatch.com>'
  tty: true
```

## How it works

On startup get a list of services and instantiate healthcheck monitor for each of them if service is in a running state. Removed, purged and etc services will be ignored

List of healthcheck monitors is updated with `pollServicesInterval` interval. When service is removed it will be no longer monitored.

When service become degraded state all targets will be invoked to process notification.

## Configuration 
```json
{
    "rancher": {
        "address": "rancher-host:port",
        "auth": {
            "accessKey": "<ACCESS_KEY>",
            "secretKey": "<KEEP_YOUR_SECRETS_SAFE>"
        },
        "projectId": "1a5"
    },
    "pollServicesInterval": 10000,
    "filter": [
        "frontend"
    ],
    "notifications": {
        "*": {
            "targets": {
                "email": {
                    "recipients": [
                        "join@snow.com"
                    ]
                }
            },
            "healthcheck": {
                "pollInterval": 5000,
                "healthyThreshold": 2,
                "unhealthyThreshold": 3
            },
        },
        "backend": {
            "targets": {
                "sms": {
                    "phones": [
                        "+122233344"
                    ]
                }
            }
        },
        "frontend": {
            "targets": {
                "http": {
                    "endpoint": "http://will-hit.this/endpoint"
                }
            }
        }
    },
    "targets": {
        "email": {
            "smtp": {
                "from": "<Alarm Service> alarm@domain.com",
                "auth": {
                    "user": "john@doe.com",
                    "password": "Str0ngPa$$"
                },
                "host": "smtp.gmail.com",
                "secureConnection": true,
                "port": 465
            }
        }
    }
}
```

### Sections
 - `rancher` Rancher API settings. `required`
 - `pollServicesInterval` interval in ms of fetching list of services. `required`.
 - `filter` whitelist filter for stack/services names in environment. List of string values. Every string is a RegExp expression so you can use something like this to match all stack services `frontend/*`. `optional`
 - `notifications` per service notification settings. Wildcard means any service `required`
    - `healtcheck` monitoring state options. `optional` defaults are:
    ```js
    {
      pollInterval: 5000,
      healthyThreshold: 2,
      unhealthyThreshold: 3
    }
    ```
    - `targets` what notification targets to use. Will override base target settings in a root `targets` section. Currently each target must be an Object value. If you have nothing to override from a base settings just place `{}` as a value. `optional`
 - `targets` base settings for each notification target. `required`

### Supported notification targets
 - email
    
## Roadmap
 - Simplify configuration.
 - More use of rancher labels and metadata. Alternate configuration through rancher labels/metadata(can be used in a conjunction with initial config).
 - Run in a rancher environment as an agent with a new label `agent: true`. No need to specify keys anymore!
 - More notifications mechanisms: AWS SNS, http, sms
 - Better email template
 - Test coverage. Setup drone.io
 - Notify when all services operate normal after some of them were in a degraded state
 - Refactor notifications
