const cwd = require('process').cwd;
const join = require('path').join;

/**
 * Object that contains client settings.
 */
module.exports = {
    /**
     * Location of the selected working folder.
     */
    workingDir: join(cwd(), 'data'),

    /**
     * Name of the selected private script.
     */
    scriptName: '',

    /**
     * Password from a user account with access to the script.
     */
    password: '',

    /**
     * Login from a user account with access to the script.
     */
    login: ''
};