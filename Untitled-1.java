setting f1 to public - db:I, s3:Allow
    f2 shows as public - db:null, s3:null
        o1 shows as public - db:null, s3:null


setting f1 to private - db:0, s3:null
    f2 shows as private - db:null, S3:null
        o1 is private - db:null, S3: null

        // coms public = where object/bucket.public is true... or if null, where a parent is true.
        // coms not public = where object/bucket.public is false or if null, where a parent is false.

        // let status;
        // if(resource.public) status =  resource.public;
        // else{
        //     // get parents
        //     sort by key length
        //     get status from first in array where not null
        // }

but the problem with this is that calculating public status is too costly


coms public = object.public = true, null or false is false

