# Changelog

### v0.2.0 (April 4, 2017)
 - Add hipchat support

### v0.1.9 (February 14, 2017)
 - Add rancher deploy files

### v0.1.8 (February 10, 2017)
 - Add graphite events support

### v0.1.7 (January 28, 2017)
 - Fix system-type services caused to crush after refetching services list. Fix #23

## v0.1.6 (January 27, 2017)
 - Ignore system stacks. Fix #23

## v0.1.5
 - Fixed retrieval of project id (environment id) PR#21
 - Minified Docker image size

## v0.1.4
 - support for rancher-agent, no need to define rancher_* variables anymore
 - add filter gsto monitor specific range of services. use `ALARM_FILTER=regex1,regex2`
 - search configs files in multiple dirs - local dir, cwd, /etc/rancher-alarms
 - huge update of docsgs
 - examples folder with env configurations
