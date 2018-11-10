#!/bin/bash -xe
dropdb ogre
createdb ogre
psql ogre -c 'create EXTENSION if not EXISTS "uuid-ossp";'
rm -rf alembic/versions/*
./generate_migration.sh
./upgrade_db.sh
