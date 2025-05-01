## Proposal for the COMS/BCBox Public Folders feature

### BCBox UX

* Public Folder control - User can set a folder as 'public'. Where we show this control is debatable. One idea was to keep it in the bucket Permissions modal.
* Public Folder view - a new unsecured page in BCBox that lists all files in a public folder
* ~~Setting a folder as public will make files directly in that folder public. It will not make files in any sub-folders pubic.~~
* ~~Individual files can be set to public/private as an exception to public status of their parent folder.~~
* Setting a file or folder as public requires the COMS MANAGE permission for that resource, which can only be granted to an IDIR user in BCBox.

### COMS API Changes

* A new `PUT bucket/<bucketId>/pubic` endpoint to toggle folder public status
* A new `public` (boolean) field in db bucket table
* Functions for updating public permission in object storage will use Policies (see [draft PR 2](https://github.com/bcgov/common-object-management-service/pull/302/files))
* COMS Sync process will determine public status (flag in COMS db) by checking for existance of policies in object-storage.
* Updating a folder's policy will update the public flag for ~~both~~ that folder ~~AND for files in that folder~~ in the COMS database.
* ~~Files can subsequently be set to private (not public) while their parent folder is set as public.~~
* change to '_checkPublic()' function in draft PR to also check public flag for all parent folders
* new function that identifies all parent folders (opposite of the existing `searchChildBuckets()` function)
* tbd: changes to COMS API reponses that show public attribute of an object to show effective value

### BCBox code changes

* BucketPublicToggle component (see [draft PR 234](https://github.com/bcgov/bcbox/pull/234))
* Disable public toggle (in 'on' position) for files/sub-folders when a parent folder is set to public.
* New view for listing files in a public folder (eg: `ListPublicObjectsView.vue`) that re-uses many of our existing child components. Actions on this page are limited to only seeing a list of the files and being able to download each one. No file details page is available.
* Changes to the Vue router configuration to allow route `/list/objects?bucketId=123` to not be protected when thsi folder is public
* Ensure existing folder invite/sharing feature still works for public folders

### Security Considerations

* Folders and files (objects) in BCBox are typically controlled using a combination of object-storage credentials and a permission granted to bcgov SSO users
* Folders/files can also be made public which requires changing the permissions in the object storage server. This can generally be done using Access Control Lists (ACL's) or Bucket Policies.
* Up to now, we have used the following ACL to make a file pubic. For more efficient control of permissions and to support public 'folders' we will replace that code and start using bucket Policies instead.
* Policies can be applied to file paths (keys) and segments (eg `/my-bucket/photos/album1/*`) which allow for control on 'folders'. ~~The Allow or Deny effect can also be used to create policies for files that override/exclude them from policies attached to their parent folder.~~
* We will also give all of the policies applied by our application a unique identifier (eg `coms::<objectId>`). This allows us to easily remove our policies and preserve any existing policies that clients may already have on their files.
* Outside of BCBox/COMS, bucket owners are able to apply a global 'Public Block' configuration which overrides all policies we apply using our application.
* ~~To reduce the risk of unintentially making files public, policies on folders will only make files directly in that folder public, and not affect files in any sub-folders.~~
* All changes to the public status files and folders are recorded to our database's audit table
