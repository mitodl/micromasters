# Generated by Django 2.2.24 on 2021-09-01 04:52

from cms.models import ResourcePage, HomePage


from django.db import migrations
from django.db.migrations.operations.special import RunPython
from django.utils.text import slugify

from wagtail.core.blocks import StreamValue


def _get_introduction_data():
    return {
        "type": "content",
        "value": {
            "heading": "Introduction",
            "detail": "<p>The MicroMasters program credential "
            + "from MIT Open Learning is a professional "
            + "and academic credential for online learners "
            + "from anywhere in the world who seek focused, "
            + "accelerated advancement.  This Privacy Statement "
            + "explains how MIT collects, uses, and processes personal "
            + "information about our learners. </p>",
        },
    }


def _get_what_personale_information_data():
    return {
        "type": "content",
        "value": {
            "heading": "What personal information we collect",
            "detail": "<p>We collect, use, store and transfer different kinds of "
            + "personal information about you, which we have grouped together as follows:</p> "
            + "<ul>"
            + "<li>Biographic information – name, gender, date of birth, email address, country of birth, country of residence</li>"
            + "<li>Employed Individuals - employer, title/position, household income, CV</li>"
            + "<li>University students – name of university, enrollment status, anticipated degree, anticipated date of graduation</li>"
            + "<li>Retired individuals – pre-retirement career, year of retirement</li>"
            + "<li>Contact information – home and business addresses, phone numbers, email addresses, phone numbers, email addresses, and social media information</li>"
            + "<li>IP addresses</li>"
            + "</ul>",
        },
    }


def _get_how_personle_information_data():
    return {
        "type": "content",
        "value": {
            "heading": "How we collect personal information about you",
            "detail": f"<p>We collect information, including Personal Information, when you create and maintain a profile and user account, participate in online courses, review application for financial assistance (if available), register for a paid certificate, send us email messages, complete an entrance or exit survey, and/or participate in our public forums and social media.<br/></p>"
            + "<p>We also collect certain usage information about student performance and patterns of learning. In addition, we track information indicating, among other things, which pages of our Site were visited, the order in which they were visited, when they were visited, and which hyperlinks and other user interface controls were used.<br/></p>"
            + "<p>We may log the IP address, operating system, and browser software used by each user of the Site, and we may be able to determine from an IP address a user's Internet Service Provider and the geographic location of his or her point of connectivity. Various web analytics tools are used to collect this information. Some of the information is collected through cookies (small text files placed on your computer that store information about you, which can be accessed by the Site). You should be able to control how and whether cookies will be accepted by your web browser. Most browsers offer instructions on how to reset the browser to reject cookies in the 'Help' section of the toolbar. If you reject our cookies, many functions and conveniences of this Site may not work properly.<br/></p>"
            + "<p>We currently collect financial information from individual registrants; however, when you register and pay for a course, you will be directed to our third party payment processor and the submission of your payment information will be subject to the terms of that third party processor’s privacy statement</p>",
        },
    }


def _get_usage_personale_information_data():
    return {
        "type": "content",
        "value": {
            "heading": "How we use your personal information",
            "detail": f"<p>We collect, use and process your personal information (1) to process transactions requested by you and meet our contractual obligations; (2) to facilitate MIT Open Learning’s legitimate interests, and/or (3) with your explicit consent, where applicable.  Examples of the ways in which we use your personal information are as follows:</p>"
            + "<ul>"
            + "<li>To enable us to provide, administer, and improve our courses.<br/></li>"
            + "<li>To help us improve MIT Micromasters program, both individually (e.g., by course staff when working with a student) and in aggregate, and to individualize the experience and to evaluate the access and use of the Site and the impact of MIT Micromasters on the worldwide educational community.<br/></li>"
            + "<li>For purposes of scientific research, particularly, for example, in the areas of cognitive science and education.<br/></li>"
            + "<li>For the purpose for which you specifically provided the information, for example, to respond to a specific inquiry or provide you with access to the specific course content and/or services you select.<br/></li>"
            + "<li>To track both individual and aggregate attendance, progress and completion of an online course, and to analyze statistics on student performance and how students learn.<br/></li>"
            + "<li>To monitor and detect violations of the Honor Code and the Terms of Service, as well as other misuses and potential misuses of the Site.<br/></li>"
            + "<li>To publish information, but not Personal Information, gathered about MIT Micromasters’s access, use, impact, and student performance.<br/></li>"
            + "<li>To send you updates about other courses offered by MIT Micromasters or other events, to send you communications about products or services of MIT Micromasters Program, affiliates, or selected business partners that may be of interest to you, or to send you email messages about Site maintenance or updates.<br/></li>"
            + "<li>To archive this information and/or use it for future communications with you.<br/></li>"
            + "<li>To maintain and improve the functioning and security of the Site and our software, systems, and network.   <br/></li>"
            + "<li>To maintain and improve the functioning and security of the Site and our software, systems, and network.<br/></li>"
            + "<li>As otherwise described to you at the point of collection or pursuant to your consent.<br/></li>"
            + "<li>To authenticate your identity when you register for a course.  <br/></li>"
            + "<li>To process refunds, as applicable<br/>.</li>"
            + "</ul>"
            + "<br/>"
            + "<p>If you have concerns about any of these purposes, or how we communicate with you, please contact us at micromasters-support@mit.edu. We will always respect a request by you to stop processing your personal information (subject to our legal obligations).</p>",
        },
    }


def share_information_content():
    return {
        "type": "content",
        "value": {
            "heading": "When we share your personal information",
            "detail": "<p>We will share information we collect (including Personal Information) with third parties as follows:</p>"
            + "<ul>"
            + "<li>With service providers or contractors that perform certain functions on our behalf, including processing information that you provide to us on the Site, processing purchases via third party providers, and other transactions through the Site, operating the Site or portions of it, providing or administering courses, or in connection with other aspects of MIT Micromasters services.<br/></li>"
            + "<li>With other visitors to the Site, to the extent that you submit comments, course work, or other information or content (collectively, 'Postings') to a portion of the Site designed for public communications; and with other members of an MIT Micromasters class of which you are a member, to the extent you submit Postings to a portion of the Site designed for viewing by those class members. We may provide your Postings to students who later enroll in the same classes as you, within the context of the forums, the courseware, or otherwise. If we do re-post your Postings originally made to non-public portions of the Site, we will post them without your real name and email (except with your express permission), but we may use your username without your consent.<br/></li>"
            + "<li>For purposes of scientific research, particularly, for example, in the areas of cognitive science and education. However, we will only share Personal Information about you for this purpose to the extent doing so complies with applicable law and is limited to the Personal Information required to fulfill the purposes stated at the time of collection.<br/></li>"
            + "<li>To provide opportunities for you to communicate with other users who may have similar interests or educational goals. For instance, we may recommend specific study partners or connect potential student mentees and mentors. In such cases, we may use all information collected about you to determine who might be interested in communicating with you, but we will only provide other users your username, and not disclose your real name or email address, except with your express permission.<br/></li>"
            + "<li>To respond to subpoenas, court orders, or other legal process; to investigate, prevent, or take action regarding illegal activities, suspected fraud, or security or technical issues, or to enforce our Terms of Service, our Honor Code, or this Privacy Policy; as otherwise may be required by applicable law; or to protect our rights, property, or safety or those of others.<br/></li>"
            + "<li>As otherwise described to you at the point of collection or pursuant to your consent.<br/></li>"
            + "<li>To support integration with third party services. For example, videos and other content may be hosted on YouTube and other websites not controlled by us.<br/></li>"
            + "</ul>"
            "<p>In cases where we share or disclose your Personal Information: (1) the third party recipients are required to handle the Personal Information in a confidential manner and to maintain adequate security to protect the information from loss, misuse, unauthorized access or disclosure, alteration, and destruction; and (2) we will only disclose and share the Personal Information that is required by the third party to fulfill the purpose stated at the time of collection. In addition, we may share aggregated information that does not personally identify you with the public and with third parties, including but not limited to researchers and business partners.</p>",
        },
    }


def security_information_content():
    return {
        "type": "content",
        "value": {
            "heading": "How your information is stored and secured",
            "detail": "<p>MIT is dedicated to protecting Personal Information in its possession or control. This is done through a variety of privacy and security policies, processes, and procedures, including administrative, physical, and technical safeguards that reasonably and appropriately protect the confidentiality, integrity, and availability of the Personal Information that it receives, maintains, or transmits. Nonetheless, no method of transmission over the Internet or method of electronic storage is 100% secure, and therefore we do not guarantee its absolute security.<br/></p>",
        },
    }


def duration_information_content():
    return {
        "type": "content",
        "value": {
            "heading": "How long we keep your personal information",
            "detail": "<p>We consider our relationship with the MIT Micromasters community to be lifelong. This means that we will maintain a record for you until such time as you tell us that you no longer wish us to keep in touch.    After such time, we will retain a core set of information for MIT Micromasters’s legitimate purposes, such as archival, scientific and historical research and for the defense of potential legal claims. <br/></p>",
        },
    }


def europe_economic_area_information_content():
    return {
        "type": "content",
        "value": {
            "heading": "Rights for Individuals in the European Economic Area",
            "detail": "<p>You have the right in certain circumstances to (1) access your personal information; (2) to correct or erase information; (3) restrict processing; and (4) object to communications, direct marketing, or profiling. To the extent applicable, the EU’s General Data Protection Regulation provides further information about your rights.  You also have the right to lodge complaints with your national or regional data protection authority. <br/></p>"
            + "<p>If you are inclined to exercise these rights, we request an opportunity to discuss with you any concerns you may have. To protect the personal information we hold, we may also request further information to verify your identity when exercising these rights. Upon a request to erase information, we will maintain a core set of personal data to ensure we do not contact you inadvertently in the future, as well as any information necessary for MIT archival purposes.  We may also need to retain some financial information for legal purposes, including US IRS compliance.  In the event of an actual or threatened legal claim, we may retain your information for purposes of establishing, defending against or exercising our rights with respect to such claim.<br/></p>"
            + "<p>By providing information directly to MIT, you consent to the transfer of your personal information outside of the European Economic Area to the United States.  You understand that the current laws and regulations of the United States may not provide the same level of protection as the data and privacy laws and regulations of the EEA. </p>",
        },
    }


def additional_information_content():
    return {
        "type": "content",
        "value": {
            "heading": "Additional Information",
            "detail": "<p>We may change this Privacy Statement from time to time.  If we make any significant changes in the way we treat your personal information we will make this clear on our website or by contacting you directly.<br/></p>"
            + "<p>The controller for your personal information is MIT.  We can be contacted at dataprotection@mit.edu. <br/></p>"
            + "<p><b><i>This policy was last updated in August 2021</i></b></p>",
        },
    }


def populate_resource_page(apps, schema_editor):
    policy_page = ResourcePage(
        title="Privacy Policy",
        slug=slugify("Privacy Policy"),
        live="True",
        content=StreamValue(
            "content",
            [
                _get_introduction_data(),
                _get_what_personale_information_data(),
                _get_how_personle_information_data(),
                _get_usage_personale_information_data(),
                share_information_content(),
                security_information_content(),
                duration_information_content(),
                europe_economic_area_information_content(),
                additional_information_content(),
            ],
            is_lazy=True,
        ),
    )
    parent_page = HomePage.objects.all().first()

    parent_page.add_child(instance=policy_page)
    parent_page.save()


class Migration(migrations.Migration):

    dependencies = [
        ("cms", "0051_resourcepage"),
    ]

    operations = [RunPython(populate_resource_page)]
