# Getting a Google API Key

Some of the features in this project depend on various APIs available from
Google. For example, users are asked to enter their home address into their
profile, and the home address field uses an autocomplete and geocoding service
powered by the [Google Places API](https://developers.google.com/places/).
In order to use these features, either for development or for production,
you'll need to get an API key from Google.

Start by going to the [Google API Console](https://console.developers.google.com).
You'll need to sign in with a Google account in order to use the API console.
Once you're there, you'll need to make a
[project](https://support.google.com/cloud/answer/6158853)
if you don't already have one. It doesn't matter what you name your project,
or how you set it up. You can also re-use an existing project, if you already
have one.

Next, go to the "Credentials" section of the API console, and click on the
"Create Credentials" button. You want to create an API key, not an
OAuth client key or a service account key. Google will give you a key,
which is a long string of random letters and numbers.
Put this into your `.env` file, like this:

```ini
GOOGLE_API_KEY=mY-API-kEy-123
```

You're not done yet! Keep reading!

# Permissions

Google sets up very fine-grained permissions on each API key, so that you can
only use an API key with the APIs that you've enabled for it. This is so that
if an API key is compromised, the attacker is still very restricted in how they
can use that compromised API key.

You need to give your API key permissions to access the various Google APIs
used by this project. At this point, that consists of the following APIs:

* [Google Maps Geocoding API](https://developers.google.com/maps/documentation/geocoding/start)
* [Google Places API Web Service](https://developers.google.com/places/web-service/)
* [Google Maps Javascript API](https://developers.google.com/maps/documentation/javascript/)

Go to the "Credentials" section of the API console. For each API listed above,
type in the name of the API in the search box, click on the result,
and click the "Enable" button at the top of the page (next to the API's name).

That's it! Now you should be able to successfully use the features of this
project that require Google APIs.
