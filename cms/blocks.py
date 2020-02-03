"""Page blocks"""

from wagtail.core import blocks
from wagtail.images.blocks import ImageChooserBlock


class CourseTeamBlock(blocks.StructBlock):
    """
    Block class that defines a course team member
    """

    name = blocks.CharBlock(max_length=100, help_text="Name of the course team member.")
    title = blocks.RichTextBlock(
        required=False,
        features=["bold", "italic"],
        help_text="Title of the course team member."
    )
    bio = blocks.TextBlock(help_text="Short bio of course team member.")
    image = ImageChooserBlock(
        help_text='Image for the faculty member. Should be 385px by 385px.'
    )
