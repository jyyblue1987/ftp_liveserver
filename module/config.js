exports.SMS_CONFIG = {
    sms_host: 'https://api.infobip.com/sms/1/text/single',
    auth: Buffer.from("Ennovatech:123456En").toString('base64'),
    from: 'Ennovatech',
}

exports.HOTLYNC_URL = 'http://127.0.0.1/'; // http://10.204.152.24/ : temp_pro

exports.REDIS_CONFIG = {
    host: '127.0.0.1',
    port: 6379,
}

exports.MYSQL_CONFIG = {
    host     : 'localhost',
    user     : 'root',
    password : '', // Hotlync_2@16 : temp_pro
    database : 'ennovatech'
};

exports.TIMEZONE = 'Asia/Dubai';

exports.LOGOUT_TIMEOUT = 1000 * 60 * 10;

exports.CENTRAL_SERVER_URL = 'http://10.204.152.24:8003/';

exports.AVAYA_SERVER_CONFIG = {'unitIPAddress': '192.168.51.14',
                                'portNumber': '50805',
                                'portNumberSpecified': true,
                                'accountName': 'Hotlync',
                                'accountPassword': 'Abcd@1234',
                                'wsdl': 'http://192.168.51.8:8085/IPOConfigurationService?wsdl',
                                };


