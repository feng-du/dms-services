const path = require('path');
const mongoose = require('mongoose');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');

mongoose.Promise = global.Promise;

class GFSStorage {
    constructor(uri, collectionName) {
        this.uri = uri;
        this.root = collectionName;

        this.storage = this.getStorage();
        this.gfs = this.storage.gfs;
    }

    getStorage() {
        const { uri, root } = this;

        mongoose.connect(uri);

        Grid.mongo = mongoose.mongo;
        const gfs = Grid(mongoose.connection.db);

        /** Setting up storage using multer-gridfs-storage */
        const storage = GridFsStorage({
            gfs : gfs,
            filename: function (req, file, cb) {
                const datetimestamp = Date.now();
                const extname = path.extname(file.originalname);
                const filename = `${file.fieldname}-${datetimestamp}${extname}`;
                cb(null, filename);
            },
            /** With gridfs we can store aditional meta-data along with the file */
            metadata: function(req, file, cb) {
                cb(null, { originalname: file.originalname });
            },
            root: root //root name for collection to store files into
        });

        return storage;
    }

    getFile(filename) {
        const { gfs, root } = this;

        gfs.collection(root); //set collection name to lookup into

        /** First check if file exists */
        const p = gfs.files.find({ filename })
            .toArray()
            .then(files => {
                if(!files || files.length === 0){
                    throw new Error(404);
                }

                return {
                    file: files[0],
                    stream: gfs.createReadStream({
                                filename: files[0].filename,
                                root: root
                            })
                }
        });

        return p;
    }

}

module.exports = GFSStorage;