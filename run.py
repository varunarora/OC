from articles.models import Article

a = Article.objects.all()

def s(x):
	s.save()
	
map(s, a)
