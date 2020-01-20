var config = require('./config');
var mysql   = require('mysql');
var xml2js   = require("xml2js");
var parser = new xml2js.Parser();
var fs = require('fs');

var xml = fs.readFileSync('config.xml', 'utf-8');

parser.parseString(xml, function(err, result) {
    console.log(result);

    config.MYSQL_CONFIG.host = result.settings.db_host[0];
    config.MYSQL_CONFIG.user = result.settings.db_user[0];
    config.MYSQL_CONFIG.password = result.settings.db_password[0];
    config.MYSQL_CONFIG.database = result.settings.db_name[0];

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
