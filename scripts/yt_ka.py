from oc_platform import settings
from django.core.management import setup_environ
setup_environ(settings)

from oer.models import Resource
from license.models import License
from django.contrib.auth.models import User
from oc_platform import FormUtilities

from oer.BeautifulSoup import BeautifulSoup
from urllib import urlopen

# API Imports
from apiclient.discovery import build

# Set DEVELOPER_KEY to the "API key" value from the "Access" tab of the
# Google APIs Console http://code.google.com/apis/console#access
# Please ensure that you have enabled the YouTube Data API for your project.
DEVELOPER_KEY = "AIzaSyCln8WLib8HxZ6OvBvybN1VB10ROMxkdzs"
YOUTUBE_API_SERVICE_NAME = "youtube"
YOUTUBE_API_VERSION = "v3"

def youtube_search(channel, youtube):
    # Sending request in search form and making a list of received items
    # Yt imposes max limit of 50 items

    # NOTE(Laurel): Order by date not working as of 6/25/13, internal apple problem.
    # Ordering by dates allows us to look up based on time published
    search_response = youtube.search().list(channelId=channel,
                                            part="id,snippet",
                                            order='date',
                                            type='video',
                                            maxResults=50).execute()

    # Set starting index to the last one (50th)
    index = len(search_response['items']) - 1
    while True:
        # Check if times are different
        if (search_response['items'][index-1]['snippet']['publishedAt']==
            search_response['items'][index]['snippet']['publishedAt']):
            # If same, look at next one up
            index -= 1
        else:
            # If different, stop looking
            break

    # Set time that next search will start at
    startTime=search_response['items'][index]['snippet']['publishedAt']

    videos=[]
    for x in xrange(index):
        # Get video ID and title from the search response.
        vid_id = search_response['items'][x]["id"]["videoId"]

        # Add video [] in order title, id, url
        videos.append(get_video(vid_id, youtube))

    # Now search for the rest of the videos until response returns < 50 items
    while (len(search_response['items']) >= 49):
        search_response = youtube.search().list(channelId=channel,
                                                part="id,snippet",
                                                order='date',
                                                type='video',
                                                # Ensures looking at results before
                                                # the last determined date
                                                publishedBefore=startTime,
                                                maxResults=50).execute()

        # Look at 50th item, index 49
        index = len(search_response['items']) - 1

        while True:
            if (search_response['items'][index-1]['snippet']['publishedAt']==
                search_response['items'][index]['snippet']['publishedAt']):
                index-=1
            else:
                break

        # Assign new start time
        startTime=search_response['items'][index]['snippet']['publishedAt']

        for x in xrange(index):
            vid_id = search_response['items'][x]["id"]["videoId"]
            videos.append(get_video(vid_id, youtube))

    return videos

def enterDatabase(videos):
    for x in xrange(len(videos)):
        try:
            r = Resource()
            r.title = videos[x][0]
            r.type = 'video'
            # NC-ND
            r.license = License.objects.get(title='CC-BY-NC-ND')
            # Get description
            if str(videos[x][1]) != '':
                r.body_markdown = str(videos[x][1])
            else:
                r.body_markdown = ''
            r.url = videos[x][2]
            r.visibility = 'public'
            r.cost = 0.0
            r.source = 'YouTube'
            r.user = User.objects.get(username='khanacademy')
            r.save()

            # Get tags
            if videos[x][3]:
                for tag in videos[x][3]:
                    r.tags.add(tag)

        except Exception, e:
            print e


def get_video(vid_id, youtube):
    url = ('http://www.youtube.com/watch?v=%s') % (vid_id)
    search_response = youtube.videos().list(part="id,snippet",
                                            id=vid_id).execute()

    raw_keywords = get_video_tags(url)

    from meta.models import TagCategory
    tag_category = TagCategory.objects.get(title='Videos')

    if raw_keywords:
        tags = FormUtilities.get_taglist(raw_keywords.split(','), tag_category)
    else:
        tags = None

    return [search_response['items'][0]["snippet"]["title"],
            search_response['items'][0]["snippet"]["description"],
            url,
            tags
        ]


def get_video_tags(url):
    source = urlopen(url)
    soup = BeautifulSoup(source)

    # Extract the page title, and the description from its meta
    #     tags in <head>
    tags = soup.findAll(
        'meta', attrs={'name': "keywords"}
    )[0]

    if tags:
        return tags['content']
    else:
        return None

# KhanAcademy channel id is 'UC4a-Gbdw7vOaccHmFo40b9g'
channel='UC4a-Gbdw7vOaccHmFo40b9g'

# Building request to YT
youtube = build(YOUTUBE_API_SERVICE_NAME, YOUTUBE_API_VERSION,
                developerKey=DEVELOPER_KEY)

videos = youtube_search(channel, youtube)

for video in videos:
    print '(%s, %s, %s, %s)' % (video[0], video[1], video[2], video[3]) 

# Enter the videos into the database
enterDatabase(videos)
