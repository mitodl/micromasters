web: bin/start-nginx bin/start-pgbouncer newrelic-admin run-program uwsgi uwsgi.ini
worker: bin/start-pgbouncer newrelic-admin run-program celery -A micromasters.celery:app worker -Q dashboard,default -B -l $MICROMASTERS_LOG_LEVEL
extra_worker: bin/start-pgbouncer newrelic-admin run-program celery -A micromasters.celery:app worker -Q dashboard,default -l $MICROMASTERS_LOG_LEVEL
