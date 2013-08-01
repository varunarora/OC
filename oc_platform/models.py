from django.db import models


class Article(models.Model):
    id = models.AutoField(primary_key=True)
    revision_id = models.ForeignKey('Revision', db_column='revision_id')
    category_id = models.ForeignKey('Category', db_column='category_id')
    language_id = models.IntegerField(max_length=11)
    created = models.DateTimeField()
    changed = models.DateTimeField()
    title = models.CharField(max_length=256)
    views = models.IntegerField(max_length=11)
    license_id = models.ForeignKey('License', db_column='license_id')
    slug = models.CharField(max_length=256)
    difficulty = models.PositiveIntegerField(max_length=10)
    published = models.NullBooleanField()
    citation = models.CharField(max_length=1024)

    class Meta:
        managed = False
        db_table = 'articles_article'

    def __unicode__(self):
        return self.title


class Category(models.Model):
    id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=256)
    parent_id = models.ForeignKey('self', null=True, db_column='parent_id')
    project = models.NullBooleanField()
    created = models.DateTimeField()
    slug = models.SlugField(null=True)

    class Meta:
        managed = False
        db_table = 'meta_category'

    def __unicode__(self):
        return self.title


class Collection(models.Model):
    id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=256)
    created = models.DateTimeField()
    owner_type_id = models.IntegerField(max_length=11)
    owner_id = models.PositiveIntegerField(max_length=10)
    visibility = models.CharField(max_length=256)
    changed = models.DateTimeField()
    slug = models.CharField(256)

    class Meta:
        managed = False
        db_table = 'oer_collection'

    def __unicode__(self):
        return self.title


class Comment(models.Model):
    id = models.AutoField(primary_key=True)
    body_markdown = models.TextField()
    created = models.DateTimeField()
    user_id = models.ForeignKey('User', db_column='user_id')
    parent_type_id = models.IntegerField(max_length=11)
    parent_id = models.PositiveIntegerField(max_length=10)
    body_markdown_html = models.TextField()

    class Meta:
        managed = False
        db_table = 'interactions_comment'

    def __unicode__(self):
        return self.title


class License(models.Model):
    id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=256)
    description = models.TextField()
    custom = models.NullBooleanField()

    class Meta:
        managed = False
        db_table = 'license_license'

    def __unicode__(self):
        return self.title


class Project(models.Model):
    id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=256)
    created = models.DateTimeField()
    description = models.TextField()
    cover_pic = models.CharField(max_length=100)
    visibility = models.CharField(max_length=256)
    meta = models.TextField()
    slug = models.CharField(max_length=256)

    class Meta:
        managed = False
        db_table = 'projects_project'

    def __unicode__(self):
        return self.title


class Resource(models.Model):
    id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=256)
    type = models.CharField(max_length=40)
    license_id = models.ForeignKey('License', db_column='license_id')
    url = models.URLField()
    body_markdown = models.TextField(null=True)
    created = models.DateTimeField()
    cost = models.DecimalField()
    views = models.IntegerField(max_length=11)
    user_id = models.ForeignKey('User', db_column='user_id')
    file = models.CharField(max_length=100)
    body_markdown_html = models.TextField(null=True)

    class Meta:
        managed = False
        db_table = 'oer_resource'

    def __unicode__(self):
        return self.title


class Revision(models.Model):
    id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=256)
    category_id = models.ForeignKey('Category', db_column='category_id')
    created = models.DateTimeField()
    body_markdown = models.TextField()
    user_id = models.ForeignKey('User', db_column='user_id')
    body_markdown_html = models.TextField()
    objectives = models.TextField()
    log = models.CharField(max_length=256)
    article_id = models.ForeignKey('Article', db_column='article_id', related_name='articles')
    flag = models.CharField(max_length=64)

    class Meta:
        managed = False
        db_table = 'articles_articlerevision'

    def __unicode__(self):
        return self.title


class User(models.Model):
    id = models.AutoField(primary_key=True)
    username = models.CharField(max_length=30, unique=True)
    first_name = models.CharField(max_length=30)
    last_name = models.CharField(max_length=30)
    email = models.CharField(max_length=75)
    password = models.CharField(max_length=128)
    is_staff = models.BooleanField()
    is_active = models.BooleanField()
    is_superuser = models.BooleanField()
    last_login = models.DateTimeField()
    date_joined = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'auth_user'

    def __unicode__(self):
        return self.username


class UserProfile(models.Model):
    id = models.AutoField(primary_key=True)
    user_id = models.ForeignKey('User', db_column='user_id', related_name='user', unique=True)
    dob = models.DateTimeField()
    location = models.CharField(max_length=256)
    profession = models.CharField(max_length=256)
    profile_pic = models.CharField(max_length=100)
    gender = models.BooleanField()

    class Meta:
        managed = False
        db_table = 'user_account_userprofile'

    def __unicode__(self):
        return self.title
