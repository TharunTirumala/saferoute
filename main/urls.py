from django.conf.urls import patterns, include, url

from main import views
from django.conf.urls.static import static
from django.conf import settings

urlpatterns = patterns('',
    # Examples:
    # url(r'^$', 'shakti.views.home', name='home'),
    # url(r'^blog/', include('blog.urls')),
    url(r'^mark',views.mark,name='mark'),
    url(r'^get',views.get,name='get'),
    url(r'^logph',views.logph,name='logph'),
    url(r'^run',views.run,name='run'),
    url(r'^login',views.LoginRequest,name='login'),
    url(r'^register',views.UserRegistration,name='register'),
    url(r'^home',views.Home,name='home'),
    url(r'^path/',views.Path,name='path'),
) + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
