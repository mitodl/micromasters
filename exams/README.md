# Edx  Proctored Exam

### How to populate the edx exam coupons

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