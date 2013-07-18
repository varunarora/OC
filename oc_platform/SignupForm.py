from django import forms


class SignupForm(forms.Form):
    name = forms.CharField(max_length=100)
    organization = forms.CharField(required=False)
    email = forms.EmailField()
    purpose = forms.CharField(max_length=10)
