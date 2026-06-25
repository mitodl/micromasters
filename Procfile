web: bin/start-nginx bin/start-pgbouncer granian --interface wsgi --host 0.0.0.0 --port 8077 --workers 2 micromasters.wsgi:application
worker: bin/start-pgbouncer celery -A micromasters.celery:app worker -Q search,exams,dashboard,default -B -l $MICROMASTERS_LOG_LEVEL
extra_worker: bin/start-pgbouncer celery -A micromasters.celery:app worker -Q search,exams,dashboard,default -l $MICROMASTERS_LOG_LEVEL
