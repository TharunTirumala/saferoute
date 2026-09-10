Google-Maps-Location-Picker
==========================

<p>Returns latitude and longitude by dropping a point on the map, moving the pointer around the map or by location search.</p>

<h2>Description</h2>
<p>Use Google Maps to find the latitude and longitude of any point. This is intended to be used in an application where you need to capture the latitude and longitude of a point specified by a user on the map. Latitude and longitude will be returned in one of three ways:</p>
<ul>
<li>Click any point on the map to drop a map marker</li>
<li>Drag the map marker to any point on the map</li>
<li>Use the search field to find geocoded locations from Google Maps</li>
</ul>
<p>Using the location search method will return a reverse geocoded lat/lng for that address. Placing a pin on the map will return the lat/lng for that point, which should be more accurate than the location search.</p>
<p>This example includes only basic css for styling the page, you will want to apply your own styles to the form elements.</p>

<h2>Requirements</h2>
<p>
<ul>
<li>jQuery</li>
<li>jQuery UI - Used for the location search autocomplete</li>
<li>Google Maps API v3</li>
</ul>
</p>

<h2>Installation and Setup</h2>
<p>Open map.html in your broswer.</p>

<h2>Credit</h2>
<p>Location search based on Robbie Shade's example: http://rjshade.com/2012/03/27/Google-Maps-autocomplete-with-jQuery-UI/</p>
