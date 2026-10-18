#!/bin/sh
set -eu
# JAVA_OPTS is an administrator-controlled list of JVM flags.
exec java ${JAVA_OPTS:-} -jar /app/app.jar "$@"
