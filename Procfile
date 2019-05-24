web: bin/start-nginx bin/start-pgbouncer newrelic-admin run-program uwsgi uwsgi.ini
worker: bin/start-pgbouncer celery -A micromasters.celery:app worker -B -l $MICROMASTERS_LOG_LEVEL
extra_worker: bin/start-pgbouncer celery -A micromasters.celery:app worker -l $MICROMASTERS_LOG_LEVEL
