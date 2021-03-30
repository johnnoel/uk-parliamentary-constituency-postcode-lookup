# UK Parliamentary Constituency Postcode Lookup

A small app to look up a parliamentary constituency based on your postcode **without** using an external API or database.

## Basic concept

As there are a relatively small number of constituencies - 650 - the problem of locating a constituency from a postcode becomes less about geocoding and more about what is the minimum about of data that needs to be held.

The way I initially approached this (see below for historical details on the idea) was to think of it like a tree. Postcodes are always entered in left to right, so if someone entered in the first letter of their postcode, "S" for instance, what are all the possible next letters or numbers that they can enter? And more to the point, what are all the possible constituencies based on that first, and subsequent characters?

The approach I've used is a big regular expression for each constituency for each first postcode character. So when a user types in their postcode, e.g. "SW1A 2AA", it will load the "S" constituencies, then try and match that postcode against a series of regular expressions trying to match it against a constituency.

## History

I originally used this concept for a Channel 4 support website during the 2015 General Election to indicate how much "power" an individual vote had within a constituency.

At the time, Channel 4 had a policy that any project that required non-static resources - i.e. database, REST API, lambdas etc. - would have to go through a process of load testing, pen testing, financial justification and generally require a lot of time investment to manage. So, any solution that *didn't* require these things could be achieved quicker and with less ongoing costs.

### Approach

My initial investigation into whether it was viable to do postcode lookups client-side immediately discounted things like loading the postcode database into something like IndexDB, or serving a postcode database at all due to its prohibitive size.

My next attempt was as a tree structure, with each node being the possibilities of what could come next, and if there was only one possible constituency, return that, e.g.

```
                S
      ──────────┴────────
    ABDRT     478QW    125Z
      │         │
123───┴──456   234
 │        │     │
 │        │     │
...      ...   ...
```

This more or less worked however my representation of the tree - JSON in this case - made the resulting files prohibitively large.

At this point I knew it was possible to do, it was just a case of optimising what was generated. I had two broad areas I could put my time into:

1. Use a custom representation of the tree i.e. binary or simple text without any of the JSON decoration
2. Use a different representation

There was a tongue-in-cheek saying at the agency where I worked when it came to solving problems: "Have you tried flexbox? Have you tried a regular expression?" In this case, I went for the latter.

### Regexes

I had originally used a square bracket notation in my tree representation to differentiate between "characters in the postcode" versus "constituency ID" which is likely what sparked the ludicrous idea to use regular expressions. E.g.

```
                S
      ──────────┴────────
   [ABDRT]   [478QW]  [125Z]
      │         │
123───┴       [234]
```

At the time I rolled my own regular expression generator that mostly worked on subpatterns and character classes, deciding when to use a hyphen within a class versus just outputting the letters as a micro optimisation for size. They were simple which meant I could use them in PHP as well as JavaScript without any changes. It was also enormously slow and hugely unoptimised, but it did work.

I used a set of PHP scripts to generate the resulting JSON files as well as to verify that the regular expressions matched correctly.

## Revisiting the idea

The Channel 4 project came and went but I always wanted to come back to the concept to see if I could make it better: the files smaller, the expressions tighter.

A random tweet introduced me to [grex](https://github.com/pemistahl/grex) which is a command line tool, written in Rust, that generates a regular expression from user provided test cases. (It [accomplishes this](https://github.com/pemistahl/grex#7--how-does-it-work-top-) in a far more robust and clever way than my mongrel script approach)

Now I just had to rebuild the system around the grex generated regexes to see if the concept still held.

Most of the project was ingesting the postcode data into a local PostgreSQL instance in order to push the postcodes through grex and generate a JSON file. Initially I used the [Ordnance Survey's Code-Point](https://www.ordnancesurvey.co.uk/business-government/products/code-point-open) dataset for this, however that doesn't come with the parliamentary constituency attached to it but does come with the British National Grid coordinates. I then got the [Office for National Statistics parliamentary constituency boundary data](https://geoportal.statistics.gov.uk/search?collection=Dataset&sort=name&tags=all(BDY_PCON)) and after some faffery extracting the polygons, did a simple "what polygon is this point in?" check when storing the postcode, making sure to convert from the BNG coordinates to WSG84.

For 1.6 million postcodes this took a while. It was also pointless.

The Office for National Statistics have their [own postcode directory available](https://geoportal.statistics.gov.uk/datasets/ons-postcode-directory-february-2021) which not only contains more postcodes (2.6 million) but also the parliamentary constituency code, and the WGS84 coordinates for the postcode. So as much as I wanted to play around with PostGIS, it would not be on this project.

## Build it yourself

You'll need NodeJS 14 or over (older versions may work), Docker, and grex. You should also download the ONS postcode directory and the ONS parliamentary constituency boundaries.

1. Clone this repository
2. `npm install`
3. `docker-compose up -d`
4. `npx tsc`
5. `node build/1-import-boundaries.js` this will pull the boundaries out of the KML file and put them into PostgreSQL
6. `node build/2-import-postcodes.js` this will pull the postcodes out of the CSV and put them into PostgreSQL
7. `node build/3-build-regexes.js [A-Z]` this will generate the regexes for each constituency for each postcode first letter and put it in `public/build/[letter].json`
8. `npm run build`
9. Go to [http://localhost:2501/](localhost:2501) and try out some postcodes

## Links

* [Original agency blog post](https://joipolloi.com/postcodes-to-constituency-on-the-client-side/)
* [Office for National Statistics postcode directory](https://geoportal.statistics.gov.uk/datasets/ons-postcode-directory-february-2021)
* [Office for National Statistics parliamentary constituency boundaries](https://geoportal.statistics.gov.uk/search?collection=Dataset&sort=name&tags=all(BDY_PCON))
* [Ordnance Survey postcode directory](https://www.ordnancesurvey.co.uk/business-government/products/code-point-open)

## License

All of the code is released under the MIT License. If you make use of the code, it would be great to [hear from you](https://twitter.com/ceetea_). Postcode and parliamentary constituency boundary data is not provided here and subject to their own license and usage restrictions.
