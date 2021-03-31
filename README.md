# UK Parliamentary Constituency Postcode Lookup

Look up a parliamentary constituency from a postcode **without** using an external API or database.

## Basic concept

There are a relatively small number of constituencies - 650 - so the problem of mapping one to a postcode becomes less about geocoding and more about what is the minimum about of data that can lead to it.

Postcodes are always entered in left to right, so if someone entered in the first character of a postcode, "S" for instance, what are all the possible next letters or numbers that they can enter? And more to the point, what are all the possible constituencies based on that first, and subsequent characters?

The approach I've ended up with is a big regular expression for each constituency for each first postcode character. So when a visitor types in a postcode, e.g. "SW1A 2AA", it will first load all the regular expressions for all the possible "S" constituencies, then attempt to match against them.

## Build it yourself

You'll need NodeJS 14 or over (older versions may work), [Docker](https://www.docker.com/products/docker-desktop), and [grex](https://github.com/pemistahl/grex). You should also download the [ONS postcode directory](https://geoportal.statistics.gov.uk/datasets/ons-postcode-directory-february-2021) and the [ONS parliamentary constituency boundaries](https://geoportal.statistics.gov.uk/search?collection=Dataset&sort=name&tags=all(BDY_PCON)).

1. Clone this repository
2. `npm install`
3. `docker-compose up -d`
4. `npx tsc`
5. `node build/1-import-boundaries.js [KML file]` this will pull the boundaries out of the KML file and put them into PostgreSQL
6. `node build/2-import-postcodes.js [CSV file]` this will pull the postcodes out of the CSV and put them into PostgreSQL
7. `node build/3-build-regexes.js [A-Z]` this will generate the regexes for each constituency for each postcode first letter and put it in `public/data/[letter].json`, you'll likely need to update the `grexLocation` constant
8. `npm run build`
9. Go to [http://localhost:2501/](localhost:2501) and try out some postcodes

## History

I originally came up with this concept while working on a [Channel 4](https://www.channel4.com/) project during the 2015 General Election whose purpose was to indicate how much "power" (swing potential for the incumbent party) an individual vote had within a constituency.

At the time, Channel 4 had a policy that any project that required non-static resources - i.e. database, REST API, queue, caching etc. - would have to go through a process of load testing, pen testing, financial justification and generally require a lot of ongoing time investment to manage. So, any solution that *didn't* require these things could be achieved quicker and with less ongoing costs.

### Approach

An initial investigation into whether it was viable to do postcode lookups client-side immediately discounted things like loading the postcode database into something like IndexDB from a CSV, or serving a postcode database at all due to its prohibitive size.

My next area of investigation was representing the postcodes as a tree / unidirectional graph, with each node being the possibilities of what characters could come next, eventually leading to a constituency, e.g.

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

My prototype worked, however my stored representation of the tree - JSON in this case - still resulted in uncomfortably large files.

At this point I knew the idea had legs, it was mostly a case of optimising what was generated. I had two broad areas I thought I should put my time into:

1. Use a custom stored representation of the tree i.e. binary or simple text without any of the JSON decoration
2. Use a different representation

There was a tongue-in-cheek saying at the agency where I worked when it came to solving problems: "Have you tried flexbox? Have you tried a regular expression?" In this case, I went for the latter.

### Regexes

I had originally used a square bracket notation in my tree representation to differentiate between "characters in the postcode" versus "constituency ID" which is likely what sparked the ludicrous idea to use regular expressions instead of a tree, e.g.

```
                S
      ──────────┴────────
   [ABDRT]   [478QW]  [125Z]
      │         │
123───┴       [234]
```

At the time I rolled my own regular expression generator that focused on subpatterns and character classes, deciding when to use a hyphen within a class versus just outputting the letters as a micro optimisation for file size. The resulting regexes were simple which meant I could use them in PHP as well as JavaScript without any changes. The process was enormously slow and hugely unoptimised, but under time pressure, slowly working is better than not at all.

I used a set of PHP scripts to generate the resulting JSON files as well as to verify that the regular expressions matched correctly. The final webpage used pre-load hints for the JSON files and a React UI to handle displaying the results.

## Revisiting the idea

The Channel 4 project came and went but I always wanted to come back to the concept to see if I could make it better: the files smaller, the expressions tighter.

A random tweet introduced me to [grex](https://github.com/pemistahl/grex) which is a command line tool, written in Rust, that generates a regular expression from user provided test cases. (It [accomplishes this](https://github.com/pemistahl/grex#7--how-does-it-work-top-) in a far more robust and clever way than my mongrel script approach)

Now I just had to rebuild the system around the grex generated output to see if the concept still held.

Most of the project was ingesting the postcode data into a local PostgreSQL instance in order to push the postcodes through grex and generate a JSON file. Initially I used the [Ordnance Survey's Code-Point](https://www.ordnancesurvey.co.uk/business-government/products/code-point-open) dataset for this, however that doesn't come with the parliamentary constituency attached to it but does come with the British National Grid coordinates (easting and northings). I then got the [Office for National Statistics parliamentary constituency boundary data](https://geoportal.statistics.gov.uk/search?collection=Dataset&sort=name&tags=all(BDY_PCON)) and after some faffery extracting the polygons from the KML, did a simple "what polygon is this point in?" check when storing the postcode, making sure to convert from the BNG coordinates to WGS84.

For 1.6 million postcodes this took a while. It was also pointless.

The Office for National Statistics have their [own postcode directory available](https://geoportal.statistics.gov.uk/datasets/ons-postcode-directory-february-2021) which not only contains more postcodes (2.6 million including Northern Ireland) but also the parliamentary constituency code *and* the WGS84 coordinates for the postcode. So as much as I wanted to play around with [PostGIS](https://postgis.net/), it would not be on this project.

The grex generated regular expressions are comparable in size to the ones I generated manually before though I haven't done the optimisation of truncating the postcode if possible, i.e. if all postcodes beginning `S3 7` point to a single constituency, there's no point having a character class after it. This would require some tweaking of the regular expressions as grex uses start / end line anchors by default.

For the interface I've switched from React to [Svelte](https://svelte.dev/), mostly to try it out and its smaller compiled size and no longer pre-load hint the JSON files, mostly in a naive attempt to save on bandwidth.

### Todo

Conceptually this is now feature complete and proves the idea. I do wonder about the computation overhead for matching against all those regular expressions so could switch this to be in a web worker rather than in the main thread. Similarly this could easily work offline so putting together a service worker to cache the resources wouldn't be too difficult.

## Links

* [Original agency blog post](https://joipolloi.com/postcodes-to-constituency-on-the-client-side/)
* [Office for National Statistics postcode directory](https://geoportal.statistics.gov.uk/datasets/ons-postcode-directory-february-2021)
* [Office for National Statistics parliamentary constituency boundaries](https://geoportal.statistics.gov.uk/search?collection=Dataset&sort=name&tags=all(BDY_PCON))
* [Ordnance Survey postcode directory](https://www.ordnancesurvey.co.uk/business-government/products/code-point-open)

## License

All of the code is released under the MIT License. If you make use of the code, it would be great to [hear from you](https://twitter.com/ceetea_). Postcode and parliamentary constituency boundary data is not provided here and subject to their own license and usage restrictions.
