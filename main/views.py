from django.shortcuts import render_to_response,render
from django.template import RequestContext
from django.http import HttpResponseRedirect,Http404,HttpResponse
from django.core.exceptions import ObjectDoesNotExist
from django.contrib import auth
from django.contrib.auth.models import User
#from django.utils import simplejson
from django.core import serializers
from main.models import *
from django.db import IntegrityError,DatabaseError
from decimal import Decimal
from random import randint
from django.contrib.auth import authenticate, login
#from twilio.rest import TwilioRestClient
import json
import sys
import site
import re
#import requests
#from bs4 import BeautifulSoup, NavigableString
import unicodedata
import re
import os
import csv
import ast
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from .forms import *
import json
import requests
from math import radians, cos, sin, asin, sqrt
import csv
from operator import itemgetter

#from sms.models.message import *
#from sms.fixtures import *
# Create your views here.
#a=User.objects.get(id=1)
def avrating(clat,clong):  # to calculate the average rating of a particular cordinate by all the users.(Takes input the latitude and longitutde)
	p=Tag.objects.all()    #Calling all objects of Tag
	cnt=0	#counter
	rat=0	#total rating
	for i in p:
		if i.cord_lati==clat and i.cord_long==clong:  #checking for equaltiy
			cnt=cnt+1								  #incrementing the counter
			rat=rat+i.rating 						  #incrementing the rating
			q=LocationProfile.objects.get(LP=i)		  #getting the LocationProfile object of that cordinate
			q.average_rating=rat/cnt 				  #updating the average rating
			return q.average_rating


def mark(request):
	if request.POST:
		cord_lati=request.POST['lati']
		cord_long=request.POST['long']
		reason_title=request.POST['title']
		short_desc=request.POST['sdesc']
		long_desc=request.POST['ldesc']
		rating=request.POST['rating']
		u_id=request.POST['u_id']
		resp={}
		p1=UserProfile.objects.create(us_id=u_id)
		p1.save()
		try:
			try:
				w=Tag.objects.get(cord_lati=cord_lati,cord_long=cord_long)
				w.rating=rating
				w.save()
				for i in Tag.objects.all():
					q=LocationProfile.objects.get(LP=i)
					clat=i.cord_lati
					clong=i.cord_long
					q.average_rating=avrating(clat,clong)
					q.save()
				return HttpResponse('1')
			except ObjectDoesNotExist:
				p=Tag.objects.create(cord_lati=cord_lati,cord_long=cord_long,reason_title=reason_title,short_desc=short_desc,long_desc=long_desc,rating=rating)
				p.save()
				p.ur.add(p1)
				p.save()
				lp=LocationProfile.objects.create(LP=p)
				for i in Tag.objects.all():
					q=LocationProfile.objects.get(LP=i)
					clat=i.cord_lati
					clong=i.cord_long
					q.average_rating=avrating(clat,clong)
					q.save()
				return HttpResponse('1')
		except IntegrityError, DatabaseError:
			return HttpResponse('0')
	else:
		return HttpResponse('0')

def get(request):
	resp={}
	resp['DATA']=[]
	p=Tag.objects.all()
	for i in p:
		disc={}
		q=LocationProfile.objects.get(LP=i)
		disc['id']=str(unicode(i.id))
		disc['cord_lati']=str(unicode(i.cord_lati))
		disc['cord_long']=str(unicode(i.cord_long))
		disc['reason_title']=str(unicode(i.reason_title))
		disc['short_desc']=str(unicode(i.short_desc))
		disc['long_desc']=str(unicode(i.long_desc))
		disc['user_rating']=str(unicode(i.rating))
		disc['avg_rating']=str(unicode(q.average_rating))
		resp['DATA'].append(disc)
	json= json.dumps(resp)
	return HttpResponse(json, mimetype='application/json')


def logph(request):
	if request.GET['l']=='1':
		ph=request.GET['ph']
		try:
			q=LoginCode.objects.get(us_ph=ph)
			r=q.code
		except ObjectDoesNotExist:
			r=randint(100000,999999)
			p=LoginCode.objects.create(us_ph=ph,code=r)
			p.save()
		ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "YOUR_TWILIO_ACCOUNT_SID")
		AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "YOUR_TWILIO_AUTH_TOKEN")

		client = TwilioRestClient(ACCOUNT_SID, AUTH_TOKEN)

		message=client.messages.create(
			to="+91"+ph,
			from_="+14804282566",
			body=r,  )

		return HttpResponse('True')

	elif request.GET['l']=='2':
		ph=request.GET['ph']
		r=request.GET['code']
		device_id=request.GET['dev_id']
		try:
			p=LoginCode.objects.get(us_ph=ph,code=r)
			q=UserProfile.objects.create(us_name=ph,us_id=device_id)
			w=LoginCode.objects.get(us_ph=ph)
			w.delete()
			return HttpResponse('2')
		except ObjectDoesNotExist:
			return HttpResponse('0')

def url2soup(url):
	try:
		source_code = requests.get(url)
		plain_text = source_code.text
	except:
		plain_text = ""
	soup = BeautifulSoup(plain_text)
	return soup

def content(soup):
    div = soup.find('div',{'id':'ins_storybody'})
    # s = ''.join(map(str, div.contents[1:]))
    s = ''
    try:
        for c in div.contents:
            if isinstance(c,NavigableString):
                s += (c + "\n")
    except:
        pass
    s1 =re.sub( '[\r\t]','',s.lstrip())
    s2 =re.sub('\n+','\n',s1)
    return s2

def Loc(content,loc_json):
	arr = content.split("\n")
	i=0
	s1 = ''

	for line in arr:
		s = line
		if not s == '':
			 s1 += s + "\n"
			 i += 1
		if i>1:
			break
	print s1
	print "next"
	with open('/home/sharat/learn/TEMP/shakti/filesused/coord.csv', 'rt') as f:
		reader = csv.reader(f, delimiter=',')
		for row in reader:
			l= row[0]
			if l in s1:
				print l
				print row[1],row[2]
				tmp ={}
				tmp['location_name']=l
				tmp['latitude']=row[1]
				tmp['longitude']=row[2]
				loc_json.append(tmp)
	return loc_json


def run1(request):
	loc_json=[]
	loc_json2={}
	for j in range(1,12):
		url = 'http://www.ndtv.com/topic/delhi-crime/news/page-' + str(j)
		soup = url2soup(url)
		try:
			ul = soup.find('div',{'id':'news_result'})
			ul1 = ul.find('ul')

			for i,li in enumerate(ul1.findAll('li')):

				urlli = (li.p.a['href'])
				soup = url2soup(urlli)
				text = content(soup)
				if not text == '':
					cont = (text).encode('utf-8')
					loc_json=Loc(cont,loc_json)
		except:
			pass


		print "done" + str(j)
	loc_json2['dic']=loc_json
	f = open("data.json","a")
	f.write(json.dumps(loc_json2))
	return HttpResponse(json.dumps(loc_json2), content_type='application/json')

def run2():
	w = open("data1.json","r")
	h = w.read()
	jsondata = ast.literal_eval(h)
	i = 1
	for item in jsondata["dic"]:
		n = NewsLocation(loc_name = item["location_name"],latitude = item["latitude"],longitude = item["longitude"])
		n.save()
		print i
		i = i+1
def run3():
	q = {}
	q["dic"] = []
	d = q["dic"]
	for nl in NewsLocation.objects.all():
		tmp = {}
		tmp["latitude"]=nl.latitude
		tmp["longitude"]=nl.longitude
		d.append(tmp)
	for t in Tag.objects.all():
		tmp ={}
		tmp["latitude"]=nl.latitude
		tmp["longitude"]=nl.longitude
		d.append(tmp)
	count = len(d)
	q["count"] = count
	print q
def run(request):
	w = open("data1.json","r")
	h = w.read()
	jsondata = ast.literal_eval(h)
	#print jsondata
	return HttpResponse(json.dumps(jsondata), content_type='application/json')

def LoginRequest(request):
	if request.user.is_authenticated():
		return HttpResponseRedirect('/home/')
	else:
		form = LoginForm(request.POST or None)
		if form.is_valid():
			username = form.cleaned_data['username']
			password = form.cleaned_data['password']
			student = authenticate(username=username, password=password)
			if student is not None:
				login(request, student)
				return HttpResponseRedirect('/home/')
			else:
				return HttpResponseRedirect('/login/')
		context = {'form': form}
		return render_to_response('login.html',context,context_instance = RequestContext(request))

@login_required
def LogoutRequest(request):
	logout(request)
	return HttpResponseRedirect('/')

def StartPage(request):
	if request.user.is_authenticated():
		return HttpResponseRedirect('/home/')
	else:
		return HttpResponseRedirect('/login/')


def UserRegistration(request):
	if request.user.is_authenticated():
		return HttpResponseRedirect('/home/')
	else:
		form = RegistrationForm(request.POST or None)
		if form.is_valid():
			user = User.objects.create_user(username = form.cleaned_data['username'],password = form.cleaned_data['password'])
			user.save()
			stu = U(u =user)
			stu.save()
			return HttpResponseRedirect('login/')
		return render_to_response('register.html', {'form': form}, context_instance = RequestContext(request))

@login_required
def Home(request):
	if request.POST:
		print "request.POST"
		cord_lati=request.POST['lati']
		cord_long=request.POST['long']
		reason_title=request.POST['title']
		short_desc=request.POST['sdesc']
		long_desc=request.POST['ldesc']
		rating=request.POST['rating']
		t = Tag(cord_lati=cord_lati,cord_long=cord_long,reason_title=reason_title,short_desc=short_desc,long_desc=long_desc,rating=rating)
		t.save()
		#u = U(u = request.user)
		#t.ur.add(u)
		#t.save()
		print "saved"
		print "request.user"
		u = U.objects.get(u=request.user)
		print "u"
		j = open("data1.json","r")
		h = j.read()
		q = ast.literal_eval(h)
		print "q"
		d = q["dic"]
		tmp ={}
		tmp["latitude"]=cord_lati
		tmp["longitude"]=cord_long
		d.append(tmp)
		print "d"
		q["count"] = len(d)
		print "q"
		nj = open("data1.json","w")
		print "opened"
		nj.write(str(q))
		print "written"

	return render_to_response('home.html',{}, context_instance = RequestContext(request))

def women(from_loc,to_loc):
	def distance(lat1,lon1,lat2,lon2):
		lat1,lon1,lat2,lon2=map(radians,[lat1,lon1,lat2,lon2])
		dlon = lon2 - lon1
		dlat = lat2 - lat1
		a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
		c = 2 * asin(sqrt(a))
		r = 6371
		return c * r
	radius=5
	key="AIzaSyDWnHbrMN-xh8wU5pUrKaGt_iuCfbRIk-w"
	locations=[]
	print "till open"
	with open('filesused/coord.csv') as csvfile:
		spamreader = csv.reader(csvfile, delimiter=',')
		for row in spamreader:
			tmp={}
			tmp["latitude"]=row[1]
			tmp["longitude"]=row[2]
			locations.append(tmp)
	# print locations
	# locations=json.loads(locations)
	print "opened"
	url='https://maps.googleapis.com/maps/api/directions/json?origin='+from_loc+'&destination='+to_loc+'&alternatives=true&key='+key
	r=requests.get(url)
	r=json.loads(r.text)
	arr={}
	b=[]
	for route in r['routes']:
		tmp={}
		for leg in route['legs']:
			a=[]
			for step in leg['steps']:
				a.append(step['start_location'])
				a.append(step['end_location'])
		tmp["cords"]=a
		tmp["index"]=0
		b.append(tmp)
	arr['routes']=b
	for i in arr['routes']:
		for j in i['cords']:
			lat=float(j['lat'])
			lng=float(j['lng'])
			for k in locations:
				if not k['latitude'] or not k['longitude']:
					continue
				latitude = float(k['latitude'])
				longitude = float(k['longitude'])
				if distance(lat,lng,latitude,longitude)>radius:
					i['index']+=1

	return arr

@login_required
def Path(request):
	print request
	context = {}
	if request.POST:
		print request.POST
		from_loc = request.POST['origin']
		to_loc = request.POST['destination']
		dic = women(from_loc,to_loc)
		a3 = dic['routes']
		list = sorted(a3, key=itemgetter('index'),reverse = True)
		print list
		route1 = str(json.dumps(list[0]['cords']))
		route2 = str(json.dumps(list[1]['cords']))
		route3 = str(json.dumps(list[2]['cords']))
		context = {
		'route1':'=' + route1,
		'route2':'=' +route2,
		'route3':'=' +route3,
		}
		#context = json.dumps(context)
		print context
	return render_to_response('polylines.html',context, context_instance = RequestContext(request))
