# rancher-alarms

Send notifications when something goes wrong in rancher

### PLEASE NOTE: Project in under a heavy development

# Features
 - Will kick your ass when service state is not okaaay
 - Various notification mechanisms
   - email
   - and more will be later...
 - Flexible configuration. Nothing to say, just take a look
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
  "filter": [
      "*"
  ],
  "notifications": {
      "*": {
          "email": ["john@snow.com"]
      },
      "backend": {
          "sms": ["+122233344"]
      },
      "frontend": {
          "http": "http://will-hit.this/endpoint"
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
 
   
