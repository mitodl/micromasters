# Grades

## How to manually freeze final grades


### Prerequisites
The following documentation assumes you have access to the micromasters heroku production app instance.

To be sure run:

    heroku run bash --app=<micromasters-production-app-name>

If you do not have access, ask to be granted access.

It also assumes you have access to the Django Admin.

To be sure go to:

    https://<micromasters_production_url>/admin/

and be sure you can see the admin.


You also need the edX course key of the course run you want to freeze: the course key looks like `course-v1:MITx+Analog+Learning+200+Jan_2015` .

### Check Freeze Date

The first step is to check that the freeze date for the course you want to freeze is in the past.
To verify it, go to `https://<micromasters_production_url>/admin/courses/courserun/` and search for the course run.

Open the details about the course run and verify that the "Freeze grade date" is set and it is in the past.
Plese note that all the times are UTC.


### Run the freezing

Open an heroku bash shell typing:

    heroku run bash --app=<micromasters-production-app-name>

then type:

    python manage.py freeze_final_grades <edx_course_key>

You should receive a confirmation message that an async task has been submitted or an error with the explaination
of what went wrong.

If you want to check the status of the freezing run

	python manage.py check_final_grade_freeze_status <edx_course_key>

This should tell you how many grades have been frozen and how many students had an error.

When the total number of frozen grades plus the total number of error equals the total number of students that needed to be frozen,
the task is done.

At that point you can run again

    python manage.py freeze_final_grades <edx_course_key>

to complete the freezing process and clean up the redis cached error lists.


### Something went wrong: now what?

There are few places where things might go wrong.

If the task is submitted and nothing happens for a while you might just have the celery workers busy.
To verify this in the heroku bash run

    celery inspect active -A micromasters

You should be able to see what each celery worker is doing and what is in the process queue.
If the tasks are not related to the grades, then celery
is just processing something else (likely it is refreshing the edX cache or indexing).

If the workers are empty, then something went really wrong and you should probably look at Sentry to see if there is any error there.

Another possibility is that there was an unhandled error for just one (or very few) student(s).
In that case you will find the error in Sentry, but if you want to force the freezing of the course, just run

	python manage.py complete_course_run_freeze <edx_course_key>

And this will complete the freezing of the course (but it will not solve the problem for the students who got the error).


### The grades are frozen, but you changed your mind.

If you need to revert the frozen final grades, open a django ipython shell in production

    heroku run ./manage.py shell --app=<micromasters-production-app-name>

and type (being ABSOLUTELY sure of what you are doing):

    edx_course_key = <your course key>
    from grades.models import FinalGrade, CourseRunGradingStatus

    # BE SURE THE FOLLOWING IS THE RIGHT ONE: THERE IS NO WAY TO RECOVER FROM THIS
    FinalGrade.objects.filter(course_run__edx_course_key=edx_course_key).delete()
    CourseRunGradingStatus.objects.filter(course_run__edx_course_key=edx_course_key).delete()



