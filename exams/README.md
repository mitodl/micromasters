# Edx  Proctored Exam

## How to populate the edx exam coupons

This management command takes one argument, the csv file as provided by edX. Each file contains coupon codes for one 
exam-course. The second line of the file must contain a column 'Catalog Query' which is used to 
extract the course number, and the edx_course_key of the exam-course on edX. Make sure that the 
`course_number` field is set on the course associated with the exam.

Run the command:
    
    python manage.py populate_edx_exam_coupons <file_name.csv>


## Import exam grades
This management command uses the course_id in each row to find the course and corresponding ExamRun 
for the course. Out of all exam runs it picks the latest one for which scheduling period has already 
started. Then it looks for an exam authorization for the given user and exam_run, and creates 
`ProctoredExamGrade`.


    python manage.py import_edx_exam_grades.py <file_name.csv>


### Copy a file to Heroku dyno
  1. On your local machine, calculate an md5 checksum of the grade data (use `md5` on MacOS, `md5sum` on Linux)

    md5sum <csv file name>

  2. Copy the file

    cat <file name> | pbcopy

  2. Open a bash shell on a one-off Heroku dyno:

    heroku run bash --app <micromasters-production-app-name>

  3. Create a temporary file containing the csv data to import

    cat >> <temporary file location>`

  4. Paste in the csv data and close the file with `ctrl+d`

  5. Compare the md5 checksum on the heroku dyno with the one from your local copy

    md5sum <temporary file location>
