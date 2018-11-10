#!/bin/bash
PYTHONPATH=$PYTHONPATH:. alembic revision --autogenerate
