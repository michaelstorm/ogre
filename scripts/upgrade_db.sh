#!/bin/bash
PYTHONPATH=$PYTHONPATH:. alembic upgrade head
