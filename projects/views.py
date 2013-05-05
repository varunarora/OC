from django.shortcuts import render, redirect
from projects.models import Project


def project_home(request, project_slug):
    project = Project.objects.get(slug=project_slug)
    context = {'project': project}
    return render(request, 'project.html', context)


def launch(request):
    context = {}
    return render(request, 'project/invite.html', context)


def invite(request):
    context = {}

    # If a form submission was made
    if request.method == "POST":
        submission = request.POST
        message = '%s, %s, %s\n\n%s' % (submission.get('name'), submission.get('email'),
                  submission.get('organization'), submission.get('use'))

        try:
            from django.core.mail import send_mail
            from django.conf import settings
            recipients = settings.SIGNUPS_ADMINS

            send_mail(
                'OC-Invite: Projects', message,
                'OpenCurriculum <info@theopencurriculum.org>', recipients + ['futuregenious@gmail.com'],
                fail_silently=False)
            context = {}
            return render(request, 'project/invite-success.html', context)

        except:
            context = {'form_failure': 'Failed to submit form'}

    return render(request, 'project/invite.html', context)


def new_project(request):

    # If a form submission was made
    if request.method == "POST":
        from forms import ProjectForm

        new_project_form = ProjectForm(request.POST, request.user)

        if new_project_form.is_valid():
            try:
                # Try creating a new project with the form inputs
                new_project = new_project_form.save()

                # Assign this project as owner to the collection created earlier
                new_project.collection.owner = new_project

                # Set default cover pic if not uploaded by user
                if not new_project.cover_pic:
                    _set_cover_picture(new_project, new_project_form)

                return redirect('projects:project_home', project_slug=new_project.slug)

            except:
                print "Could not create new project"

        else:
            print new_project_form.errors
            print "The form had errors"

    context = {}
    return render(request, 'new-project.html', context)


# HACK: Code copied from user_account.views. Horrible idea. Need to move to independant class
def _set_cover_picture(project, project_form):
    try:
        # Now set and save the profile image
        from django.core.files.base import ContentFile
        import os.path

        cover_pic_filename = os.path.basename(project_form.cover_pic_tmp.name)
        project.cover_pic.save(
            cover_pic_filename, ContentFile(project_form.cover_pic_tmp.read()))
        project.save()
    except:
        # TODO: Django notification for failure to create and assign profile picture
        print "Cover picture failed to be created"
