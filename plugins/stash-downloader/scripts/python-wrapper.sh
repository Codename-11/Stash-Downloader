#!/bin/sh
# Wrapper script to call system Python
# Stash prepends plugin dir to exec paths, breaking absolute paths
exec /usr/bin/python3 "$@"
