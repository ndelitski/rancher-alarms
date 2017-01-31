# rancher-alarms

Send notifications when something goes wrong in rancher

## Features
 - Will kick your ass when service state is not okay
 - Various notification mechanisms
   - email
   - slack
   - * please create an issue if you need more
 - Configure notification mechanisms globally or on a per service level(supported in `.json` config setup for now)
 - Customize your notification messages

## Quick start

### Inside Rancher environment using rancher-compose CLI
```yml
rancher-alarms:
  image: ndelitski/rancher-alarms
  environment:
    ALARM_SLACK_WEBHOOK_URL:https://hooks.slack.com/services/:UUID
  labels:
    io.rancher.container.create_agent: true
    io.rancher.container.agent.role: environment
```
[How to create Slack Webhook URL](https://my.slack.com/services/new/incoming-webhook/)

NOTE: Including rancher agent labels is crucial otherwise you need provide rancher credentials manually with RANCHER_* variables

### Outside Rancher environment using `docker run`
```
docker run \
    -d \
    -e RANCHER_ADDRESS=rancher.yourdomain.com \
    -e RANCHER_ACCESS_KEY=ACCESS-KEY \
    -e RANCHER_SECRET_KEY=SECRET-KEY \
    -e RANCHER_PROJECT_ID=1a8 \
    -e ALARM_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR_SLACK_UUID \
    --name rancher-alarms \
    ndelitski/rancher-alarms
```

## How it works

On startup get a list of services and instantiate healthcheck monitor for each of them if service is in a running state. Removed, purged and etc services will be ignored

List of healthcheck monitors is updated with a `pollServicesInterval` interval. When service is removed it will be no longer monitored.

When a service transitions to a degraded state, all targets will be invoked to process notification(s).


## docker-compose configuration 

### Docker compose for email notification target

```yml
rancher-alarms:
  image: ndelitski/rancher-alarms
  environment:
    RANCHER_ADDRESS:your-rancher.com
    ALARM_SLACK_WEBHOOK_URL:https://hooks.slack.com/services/...
```

More docker-compose examples see in [examples](https://github.com/ndelitski/rancher-alarms/tree/master/examples)

## Configuration

### Environment variables

#### Rancher settings
Could be ignored if you are running inside Rancher environment (service should be started as a rancher agent though)
 - `RANCHER_ADDRESS`
 - `RANCHER_PROJECT_ID`
 - `RANCHER_ACCESS_KEY`
 - `RANCHER_SECRET_KEY`
 
#### Polling settings
 - `ALARM_POLL_INTERVAL` 
 - `ALARM_MONITOR_INTERVAL`
 - `ALARM_MONITOR_HEALTHY_THRESHOLD`
 - `ALARM_MONITOR_UNHEALTHY_THRESHOLD`
 - `ALARM_FILTER`
 
#### Email target settings
 - `ALARM_EMAIL_ADDRESSES`
 - `ALARM_EMAIL_USER`
 - `ALARM_EMAIL_PASS`
 - `ALARM_EMAIL_SSL`
 - `ALARM_EMAIL_SMTP_HOST`
 - `ALARM_EMAIL_SMTP_PORT`
 - `ALARM_EMAIL_FROM`
 - `ALARM_EMAIL_SUBJECT`
 - `ALARM_EMAIL_TEMPLATE`
 - `ALARM_EMAIL_TEMPLATE_FILE`
 
#### Slack target settings
 - `ALARM_SLACK_WEBHOOK_URL`
 - `ALARM_SLACK_CHANNEL`
 - `ALARM_SLACK_BOTNAME`
 - `ALARM_SLACK_TEMPLATE`
 - `ALARM_SLACK_TEMPLATE_FILE`
 
See [examples](https://github.com/ndelitski/rancher-alarms/tree/master/examples) using environment config in docker-compose files

### Local json config

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
        "app/*"
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
        "frontend": {
            "targets": {
                "email": {
                    "recipients": [
                        "arya@stark.com"
                    ]
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
        },
        "slack": {
            "webhookUrl": "https://hooks.slack.com/services/YOUR_SLACK_UUID",
            "botName": "rancher-alarm",
            "channel": "#devops"
        }
    }
}
```

#### Config file sections
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

## Templates
TODO: Add description

## Roadmap
 - [] Simplify configuration.
 - [] More use of rancher labels and metadata. Alternate configuration through rancher labels/metadata(can be used in a conjunction with initial config).
 - [] Run in a rancher environment as an agent with a new label `agent: true`. No need to specify keys anymore!
 - [] More notifications mechanisms: AWS SNS, http, sms
 - [x] Support templating
 - [] Test coverage. Setup drone.io
 - [] Notify when all services operate normal after some of them were in a degraded state
 - [] Refactor code
 - [x] Shrinking image size with alpine linux
