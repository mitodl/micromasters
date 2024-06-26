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

## How to import proctored exam grades

Overview: After a proctored exam has ended, the course team will deliver a spreadsheet with the grades. They need to be imported into Micromasters.

### Checklist 

This can be used for creating an issue task at the end of each exam session. Just copy and paste the source markdown:

- [ ] Receive final exam grades from the course team
- [ ] Load grades
- [ ] Tally exam grades and confirm with the course team
- [ ] Release exam grades to learners
- [ ] Update combined final grades
- [ ] Update certificates

Detailed explanations below:

### Receive final exam grades from the course team

The course team will deliver edx exam grades to us via a csv file in dropbox (in order to ensure the file is encrypted at rest with access control). 


### Load grades

Note that users will have usernames from the platform on which they took the exams (e.g. MITx Online). If necessary, use the social_auths to convert the usernames of the exam platform to Micromasters usernames. (See exams/README.md for additional details.)

Steps:
- Copy the spreadsheet to your computer
- If necessary replace usernames with Micromasters usernames (see note above)
- Copy the spreadsheet in your pasteboard: 
   - `cat <.csv file> | pbcopy`
   - Connect to the Heroku instance for MM
   - Create a .csv:
      - `cat > [grades.csv] ENTER`
      - [paste]
      - `ENTER`
      - `control-d` to end the paste
   - Confirm you have the same number of rows in the new .csv and the original: `wc -l <filename>`
- Run the import command: `python manage.py import_edx_exam_grades [grades.csv]`
   - This will report:
      - Errors
      - Total number of grades created
      - Total number of grades modified
      - There may be some issues you can sort out here


### Tally exam grades and confirm with the course team

After grades are imported, share the list of learners and the course exam they passed. Note that you should use the original usernames from the platform on which the exams were taken.

The course team will confirm if the data matches theirs. Resolve any discrepanies.


### Release exam grades to learners 

Now that grades are loaded, we can release them to learners by updating the date/time that grades are available in the exam run admin. 


### Update combined final grades

While there is a signal that creates combined final grades whenever a proctored exam grade is updated, it depends on the proctored exam being released. So you will need to run the management command to force an update: `python manage.py populate_combined_final_grades`

Note that this may take several minutes to run.


### Update certificates

When a learner's fifth and final course certificate is created, it triggers the creation of a program certificate. Course certificates are generated every hour (on the hour), but if you'd like to, you can generate them manually using the `generate_program_certificates` management command. Note: each learner can only earn one Program certificate. 


## Sync edx current cached grade and FinalGrade
Occasionally, a learner's grade may need to be updated manually. One way this
could happen is if a learner's MITx Online account was linked to their Micromasters
account after some grades were frozen. This would result in grades being out of sync,
since `FinalGrade` doesn't get updated after grades had been frozen.
```
from django.contrib.auth.models import User
user = User.objects.get(username=username)

# If you don't know which course_run you need to sync you can find it here
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
