from django import forms
from django.contrib.auth.models import User
from django.forms import ModelForm
from .models import *


class LoginForm(forms.Form):
	username = forms.CharField(label = (u'UserName'),required = True)
	password = forms.CharField(label = (u'Password'), widget = forms.PasswordInput(render_value = False),required = True)


class RegistrationForm(ModelForm):
    username = forms.CharField(label = (u'Username'),required = True)
    password = forms.CharField(label = (u'Password'), widget = forms.PasswordInput(render_value = False))

    class Meta:
    	model = U
    	exclude = ('u','friends',)

    def clean_username(self):
    	username = self.cleaned_data['username']
    	try:
    		User.objects.get(username = username)
    	except User.DoesNotExist:
    		return username

    	raise forms.ValidationError("That username is already taken.")

    def clean_password(self):
    	password = self.cleaned_data['password']
    	return password
