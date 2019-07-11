## Electives for FA Programs

#### Abstract
This feature will allow the program team to offer learners to take a set of courses in the program as electives.
A program will optionally have a set of electives. A set of electives will be defined by a number (a set) of courses,
and a minimum number of courses from this set that the learner needs to pass in order to be able to complete the program.
A program could have more than one set of electives. 

#### Architecture Changes
Where do we need the information about electives?

1. If a course is an elective, display a message on the dashboard, 
in the course card (as a label). 
2. When creating a program certificate, if the program has a set of electives, test that set for completion.
3. Possibly for the ProgressCard.

The `Program` model should have specified the number of courses required for completion of the program. This would be 
used by the Progress Card and the generation of program certificates.

##### Models
`ElectivesSet`
- program
- title
- num_required_courses

`ElectiveCourse`
- course
- electives_set

Maybe these should be available to be set in Wagtail.

ProgressCard will work the same way as before. As an example for DEDP, if a learner passed all six 
courses the progress bar should display 6/5, and a full green circle.


##### Next Steps:
1. Create models, probably in the cms (depending who is going to be directly using this feature). Update Program model.
2. Update the logic for program certificate generation.
3. Update the ui, in ProgressCard, and CourseCard messages.

