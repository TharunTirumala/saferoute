from django.db import models
from django.contrib.auth.models import User

# Create your models here.
class Tag(models.Model):
	cord_lati=models.DecimalField(max_digits=22, decimal_places=17,null=False)
	cord_long=models.DecimalField(max_digits=22, decimal_places=17,null=False)
	reason_title=models.CharField(max_length=25,default="DANGER!!",null=False)
	short_desc=models.CharField(max_length=50,null=False)
	long_desc=models.CharField(max_length=500,null=False)
	rating=models.DecimalField(max_digits=2,decimal_places=1,null=False)
	ur=models.ManyToManyField('U',related_name='ur',null=True,blank=True)#storing list of users that marked that place
	# class Meta:

	# 	unique_together=('cord_lati','cord_long',)
	def __unicode__(self):
		return self.reason_title

class UserProfile(models.Model):
	user=models.ForeignKey(User,unique=True,null=True)#extending user model
	av_rating=models.DecimalField(max_digits=2,decimal_places=1,null=True)#storing average rating given by that user
	us_id=models.CharField(max_length=50,null=True)#device id
	us_name=models.BigIntegerField(null=True)#user's phone no. to be used as his name
	def __unicode__(self):
		return self.us_id

class LocationProfile(models.Model):
	LP=models.ForeignKey(Tag,unique=True)#extending Tag model
	average_rating=models.DecimalField(max_digits=2,decimal_places=1,null=True,blank=True)#average rating of that place by all users

class LoginCode(models.Model):
	us_ph=models.BigIntegerField(null=True)#user's phone no. to be used as his name
	code=models.BigIntegerField(null=True)#random code for that number


class U(models.Model):
	u = models.ForeignKey(User,unique = True)
	# name = models.CharField(max_length = 100)
	# email = models.EmailField()
	# contact = models.BigIntegerField()
	friends = models.ManyToManyField('self',null =True,blank=True)

	def __unicode__(self):
		return self.u.username

class U2(models.Model):
	u = models.ForeignKey(User,unique = True)
	name = models.CharField(max_length = 100)
	email = models.EmailField()
	contact = models.BigIntegerField()

	def __unicode__(self):
		return self.u.username

class NewsLocation(models.Model):
	loc_name = models.CharField(max_length = 100)
	latitude = models.DecimalField(max_digits=22, decimal_places=17,null=False)
	longitude= models.DecimalField(max_digits=22, decimal_places=17,null=False)
	flags = models.IntegerField(null = True)
	def __unicode__(self):
		return self.loc_name
