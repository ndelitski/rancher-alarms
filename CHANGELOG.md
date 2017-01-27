# Changelog

## v0.1.6 (January 27, 2017)
 - Ignore system stacks. Fix #23
 
## v0.1.5
 - Fixed retrieval of project id (environment id) PR#21
 - Minified Docker image size
  
## v0.1.4
 - support for rancher-agent, no need to define rancher_* variables anymore
 - add filter gsto monitor specific range of services. use `ALARM_FILTER=regex1,regex2`
 - search configs files in multiple dirs - local dir, cwd, /etc/rancher-alarms
 - huge update of docs
 - examples folder with env configurations
