import re
import os
import csv

loc = []

for fn in os.listdir(os.getcwd()):
	f = open(fn,"r")
	con = f.read()
	arr = con.split("\n")
	# print arr
	i =0
	s1 = ''
	for line in arr:
		s = line
		if not s == '':
			 s1 += s + "\n"
			 i += 1
		if i>1:
			break
	#print
	f2 = open("names.txt")

	with open('coord.csv', 'rt') as f:
		reader = csv.reader(f, delimiter=',')
		for row in reader:
			l= row[0]
			if l in s1:
				print l
				print row[1],row[2]
