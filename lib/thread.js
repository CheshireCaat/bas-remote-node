/**
 * 
 */
class BasThread {
    constructor (client) {
        this._client = client;

        this._isRunning = false;
        this._id = 0;
    }

    get isRunning() {
        return this._isRunning;
    }

    get id() {
        return this._id;
    }

    async runFunction(functionName, functionParams) {
        if (this._id && this._isRunning) {
            return Promise.reject("Another task is already running. Unable to start a new one");
        }

        if (!this._id) {
            this._id = Math.floor(Math.random() * 1000000) + 1
            this._client.send("start_thread", {
                thread_id: this._id
            })
        }

        return new Promise((resolve, reject) => {
            this._client.sendAsync("run_task", {
                thread_id: this.id,
                function_name: functionName,
                params: JSON.stringify(functionParams)
            })
                .then((result) => {
                    var response = JSON.parse(result);
                    this.isRunning = false;

                    if (response.Success) {
                        resolve(response.Result);
                    } else {
                        reject(response.Message);
                    }
                });
        })

    }

    stop() {
        if (this._id) {
            this._client.send("stop_thread", {
                thread_id: this._id
            });
        }

        this._isRunning = false;
        this._id = 0;
    }

}

module.exports = BasThread;