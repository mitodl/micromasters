web: bin/start-nginx bin/start-pgbouncer uwsgi uwsgi.ini
worker: bin/start-pgbouncer celery -A micromasters.celery:app worker -Q search,exams,dashboard,default -B -l $MICROMASTERS_LOG_LEVEL
extra_worker: bin/start-pgbouncer celery -A micromasters.celery:app worker -Q search,exams,dashboard,default -l $MICROMASTERS_LOG_LEVEL
