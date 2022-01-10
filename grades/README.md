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

### A user did not get a final grade

Get the user and course run

    from django.contrib.auth.models import User
    user = User.objects.get(username=username)
    from grades.models import *
    course_run=CourseRun.objects.get(edx_course_key=edx_course_key)

Check if user has a final grade

    FinalGrade.objects.filter(course_run=course_run, user=user)

Try to refresh cache

    from dashboard.api_edx_cache import CachedEdxDataApi
    CachedEdxDataApi.update_all_cached_grade_data(user)

Compute the final grade

    from grades.api import *
    get_final_grade(user, course_run)

Create a final grade for user

    from grades.api import *
    freeze_user_final_grade(user, course_run)


### The grades are frozen, but you changed your mind.

If you need to revert the frozen final grades, open a django ipython shell in production

    heroku run ./manage.py shell --app=<micromasters-production-app-name>

and type (being ABSOLUTELY sure of what you are doing):

    edx_course_key = <your course key>
    from grades.models import FinalGrade, CourseRunGradingStatus

    # BE SURE THE FOLLOWING IS THE RIGHT ONE: THERE IS NO WAY TO RECOVER FROM THIS
    FinalGrade.objects.filter(course_run__edx_course_key=edx_course_key).delete()
    CourseRunGradingStatus.objects.filter(course_run__edx_course_key=edx_course_key).delete()

## How to adjust (curve) proctored exam grades

Overview: After Pearson has delivered to all the proctored exam grades, we share them with the course team. 
It typically takes them a few weeks to adjust the grades and return them to us for upload. 

### Checklist 

This can be used for creating an issue task at the end of each exam session. Just copy and paste the source markdown:

- [ ] Wait for course team to deliver adjusted grades
- [ ] Test adjusted grades and confirm counts of new course certificates and program certificates 
- [ ] Wait for course team to confirm counts with faculty
- [ ] load adjusted grades
- [ ] release exam grades to learners
- [ ] update combined final grades
- [ ] confirm creation of course certificates and program certificates

Detailed explanations below:

### Test edx exam grades

The course team will deliver edx exam grades to us via a csv file in dropbox (in order to ensure the file is 
encrypted at rest with access control). Since adjusting grades is a complex process,
they like us to validate their changes by calculating the number of learners who, after uploading the
grades, will have earned 1, 2, 3, 4 and 5 course certificates and how many will have earned a program certificate. 

Once we and the course team have determined that there is a match the course team will validate the grade adjustment 
with the faculty. After the course team has validated the grades they will email us to confirm that we can
import the adjusted grades into the micromasters application and release them to learners. 

Both steps (1. validating the number of learners who have earned different numbers of course certificates and 2. 
receiving the email confirmation from the course team to release the grades) need to occur before importing the 
grades into the micromasters application.

### Load adjusted grades

Once that we have verified the numbers of learners that passed each course with the new exam results
with the course team, we can import them into the micromasters web application. This can be done
with the management command: `import_edx_exam_grades.py`

### Release exam grades to learners 

Now that grades are loaded, we can release them to learners by updating the date/time that grades are
available in the exam run admin. 

### Update combined final grades

While there is a signal that creates combined final grades whenever a proctored exam grade is updated, it depends on 
the proctored exam being released. So you will need to run the management command to force an update:
  
    python manage.py populate_combined_final_grades


### update certificates

When a learner's fifth and final course certificate is created, it triggers the creation of a program certificate. 
Course certificates are generated every hour (on the hour). If this is too long to wait, use the 
`generate_program_certificates` management command. Each learner can only earn one Program certificate. 


##Sync edx current cached grade and FinalGrade
It happens that after the grades were frozen, account relinking can occur 
which results in grades being out of sync, since `FinalGrade` doesn't get updated
after grades had been frozen.

```
from django.contrib.auth.models import User
user = User.objects.get(username=username)

# If you don't know which course_run you need to sinc you can find it here
from courses.models import *
course= Course.objects.filter(title=title).first()
from dashboard.utils import get_mmtrack
mmtrack = get_mmtrack(user, course.program)
from dashboard.api import *
get_info_for_course(course, mmtrack)

# When you know the edx_course_key
edx_course_key='edx-course-key'
course_run = CourseRun.objects.get(edx_course_key=edx_course_key)

# Update the final grade
from grades.api import get_final_grade
edx_grade = get_final_grade(user, course_run)

from grades.constants import *
final_grade, _ = FinalGrade.objects.update_or_create(user=user,course_run=course_run,
    defaults={
        'grade': edx_grade.grade,
        'passed': edx_grade.passed,
        'status': FinalGradeStatus.COMPLETE
})
final_grade.save()
```
