#!/bin/bash

set -e

repo=ndelitski

image=rancher-alarms

version_default=latest

container_name=$image

build() {
  local tg=${1:-$version_default}
  docker build --pull --rm -t ${image} ./
  tag $tg
}

push() {
  local version=${1:-$version_default}
  tag $version
  docker push ${repo}/${image}:${version}
}

tag() {
    local tg=$1
    docker tag ${image} ${repo}/${image}:${tg}
}

check_state() {
  local container_id=$1
  local desired_state=$2
  docker inspect -f "{{.State.${desired_state}}}" ${container_id}
}

check_exists() {
  docker inspect $1 > /dev/null && echo "true" || echo "false"
}

run() {
#  if [ "$(check_exists ${container_name})" = "true" ]; then
#    if [ "$(check_state ${container_name} Running)" = "true" ]; then
#      docker kill ${container_name}
#    fi
#    docker rm -f ${container_name}
#  fi
  docker rm -f ${container_name}  > /dev/null
  docker run \
    -it --label io.rancher.container.network=true \
    -e CONFIG_FILE=/etc/rancher-alarms/config.json \
    -v $(pwd)/config.json:/etc/rancher-alarms/config.json \
    --name ${container_name} \
    ${image}
}

case "$1" in
  'build')
    build ${@:2}
    ;;
  'run')
    run
    ;;
  'tag')
    tag ${@:2}
    ;;
  'push')
    push ${@:2}
    ;;
esac
