var fs = require('fs');
const pathname = require('path');
var config = require('./config');
var mysql   = require('mysql');
var xml2js   = require("xml2js");
var parser = new xml2js.Parser();
var chokidar = require('chokidar');
var sharp = require('sharp');
var cr2Raw = require('cr2-raw');
var sprintf = require("sprintf-js").sprintf,
    vsprintf = require("sprintf-js").vsprintf;
var FtpSrv = require('ftp-srv');

var xml = fs.readFileSync('config.xml', 'utf-8');

parser.parseString(xml, function(err, result) {
    console.log(result);

    config.MYSQL_CONFIG.host = result.settings.db_host[0];
    config.MYSQL_CONFIG.user = result.settings.db_user[0];
    config.MYSQL_CONFIG.password = result.settings.db_password[0];
    config.MYSQL_CONFIG.database = result.settings.db_name[0];
    config.FTP_PASS = result.settings.ftp_pass[0];
    config.FTP_DIR = result.settings.ftp_dir[0];
    config.FTP_DEST_DIR = result.settings.ftp_dest_dir[0];
    config.UPLOAD_DIR = result.settings.upload_dir[0];

    handleDisconnect();
});

function handleDisconnect() {
    global.connection = mysql.createConnection(config.MYSQL_CONFIG);  // Recreate the connection, since
                                                    // the old one cannot be reused.
    global.connection.connect(function(err) {              // The server is either down
        if(err) {                                     // or restarting (takes a while sometimes).
            console.log('error when connecting to db:', err);
            setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
        }
        else {
            // spyFileChanges();
        }
        // to avoid a hot loop, and to allow our node script to
    });                                     // process asynchronous requests in the meantime.
                                            // If you're also serving http, display a 503 error.
    global.connection.on('error', function(err) {
        console.log('db error', err);
        if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
            handleDisconnect();                         // lost due to either server restart, or a
        } else {                                      // connnection idle timeout (the wait_timeout
            // throw err;                                  // server variable configures this)
        }
    });
}

function runFTPServer()
{
    var ftp_dir = config.FTP_DIR;

    var host = '0.0.0.0';
    var port = 21;
    var pass = config.FTP_PASS;

    var options = {};
    options.url = `ftp://${host}:${port}`;
    
    const ftpServer = new FtpSrv(options);
 
    ftpServer.on('login', ({connection, username, password}, resolve, reject) => { 
        if (password === pass) { 
            var root_dir = ftp_dir + '/' + username;

            if (!fs.existsSync(root_dir)){
                fs.mkdirSync(root_dir);
            }

            // If connected, add a handler to confirm file uploads 
            connection.on('STOR', (error, fileName) => { 
                if (error) { 
                    console.error(`FTP server error: could not receive file ${fileName} for upload ${error}`); 
                } 
                else
                {
                    console.info(`FTP server: upload successfully received - ${fileName}`); 

                    // onAddFiles(username, fileName);
                }                
            }); 
           
            resolve({root: root_dir});            
        } else { 
            reject(new Error('Unable to authenticate with FTP server: bad username or password')); 
        } 
    });
    
    ftpServer.listen()
        .then(() => {
            console.log('started');
            console.log ( `Server running at ftp://${host}:${port}/` );
        });

    ftpServer.on('client-error', ({ context, error }) => { 
        console.error(`FTP server error: error interfacing with client ${context} ${error} on ftp://${host}:${port} ${JSON.stringify(error)}`); 
    });     
}

runFTPServer();

function spyFileChanges()
{
    var watcher = chokidar.watch(ftp_dir, {
        ignored: /[\/\\]\./, 
        persistent: true,
        awaitWriteFinish: {
            stabilityThreshold: 7000,
            pollInterval: 100
        },
    });

    watcher.on('add', function(path) {
        onAddFiles(path);
    })
    .on('addDir', function(path) {console.log('Directory', path, 'has been added');})
    .on('change', function(path) {console.log('File', path, 'has been changed');})
    .on('unlink', function(path) {console.log('File', path, 'has been removed');})
    .on('unlinkDir', function(path) {console.log('Directory', path, 'has been removed');})
    .on('error', function(error) {console.error('Error happened', error);})
    
    // 'add', 'addDir' and 'change' events also receive stat() results as second argument. 
    // http://nodejs.org/api/fs.html#fs_class_fs_stats 
    watcher.on('change', function(path, stats) {
        console.log('File', path, 'changed size to', stats.size);       
    });    
}

function onAddFiles(camera_id, path)
{
    var ftp_dest_dir = config.FTP_DIR;
    var upload_dir = config.UPLOAD_DIR + '/img';

    console.log('File', path, 'has been added');

    var filename = pathname.basename(path);
    var ext = pathname.extname(path);

    var filename_only = pathname.basename(path, ext);

    var dest_path = '';

    var dest_dir = ftp_dest_dir + '/' + camera_id; 
    if (!fs.existsSync(dest_dir)){
        fs.mkdirSync(dest_dir);
    }

    if( ext.toLowerCase() == '.cr2')
    {
        dest_path = dest_dir + '/' +  filename_only + ".png";

        var raw = cr2Raw(path);
        fs.writeFileSync(dest_path, raw.previewImage());

        // fs.unlinkSync(path);
    }
    else
    {
        dest_path = path;
    }

    var thumb_dir = upload_dir + '/' + camera_id; 
    if (!fs.existsSync(thumb_dir)){
        fs.mkdirSync(thumb_dir);
    }

    var thumb_filename = filename_only + "_thumbnail.jpg";
    var thumb_path = upload_dir + '/' + camera_id + '/' + thumb_filename;

    sharp(dest_path)
        .resize(320, 240)
        .toFile(thumb_path, (err, info) => { 
            console.log(info);
            checkCameraImageInfo(camera_id, thumb_filename, dest_path);                
        });

}

function checkCameraImageInfo(camera_id, filename, path)
{
    var sql = sprintf("SELECT * from camera_logs where camera_id = %s and thumbnail = '%s/%s'", camera_id, camera_id, filename);

    global.connection.query(sql, function(err, rows, fields) {
        if(err) {                                     // or restarting (takes a while sometimes).
            console.log('error when connecting to db:', err);
            return;
        }
        if( rows && rows.length > 0 )
            updateCameraImageInfo(rows[0].id, camera_id, filename, path);
        else    
            addCameraImageInfo(camera_id, filename, path);
    });
}

function addCameraImageInfo(camera_id, filename, path)
{
    var sql = sprintf("INSERT INTO camera_logs (camera_id, thumbnail, path) VALUES(%s, '/img/%s/%s', '%s')",
                        camera_id, camera_id, filename, path);
    if(global.connection)
    {
        global.connection.query(sql, function (err, rows, fields) {
        });
    }
}

function updateCameraImageInfo(id, camera_id, filename, path)
{
    var sql = sprintf("UPDATE camera_logs SET camera_id = %s, thumbnail = '/img/%s/%s', path = '%s' WHERE id = %s",
                        camera_id, camera_id, filename, path, id);
    
    if(global.connection)
    {
        global.connection.query(sql, function (err, rows, fields) {
        });
    }
}

