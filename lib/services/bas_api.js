window.BASThread = class
{
	constructor()
	{
    	this.ThreadId = 0;
    	this.IsRunning = false;
	}
	  
	GetId()
	{
		return this.ThreadId
	}

  	RunFunction(FunctionName, FunctionParams)
  	{
  		var self = this
  		if(self.ThreadId && self.IsRunning)
  		{
  			//Already running, reject
  			return Promise.reject("Other task is executing, can't start new task one")
  		}

  		if(!self.ThreadId)
  		{
  			//Thread not created, create one
			self.ThreadId = Math.floor(Math.random() * 1000000) + 1
			Api.Send("start_thread", {thread_id: self.ThreadId})
  		}

  		//Run new task in current thread
		return new Promise(function(resolve, reject) {
			Api.AddTask(self.ThreadId, "thread", self, FunctionName, FunctionParams)
			Api.Async("run_task", {thread_id: self.ThreadId, function_name: FunctionName, params: JSON.stringify(FunctionParams)})
				.then(function(Result){
					Api.RemoveTask(self.ThreadId)
	                var ParsedResult = JSON.parse(Result)
	                self.IsRunning = false;
	                if(ParsedResult.Success)
	                {
	                	resolve(ParsedResult.Result)
	                }else
	                {
						reject(ParsedResult.Message)
	                }
	                
	        })
  		})

  	}

	IsRunningFunction()
  	{
  		return this.IsRunning
  	}

  	StopThread()
  	{
  		if(this.ThreadId)
  		{
			Api.RemoveTask(this.ThreadId)
  			Api.Send("stop_thread", {thread_id: this.ThreadId})
  		}

  		this.ThreadId = 0
  		this.IsRunning = false
  	}

}


window.ApiClass = class 
{
	constructor()
	{
    	this.Callback = null;
    	this.Socket = null
    	this.Buffer = ''
    	this.ResourcesDefault = []
    	this.AsyncRequests = {}
        this.ScheduledTasks = []
        this.CanSchedule = false
	}
	  

  	Send(Type,Data,Async)
  	{
  		if(!this.Socket)
  			new Promise(function(resolve, reject) {
  				resolve(null)
			});
  		

  		let Id = Math.floor(Math.random() * (999999 - 100000) + 100000)
  		let D = {"type": Type, "data": Data, id: Id}
  		if(Async)
  			D["async"] = true
  		//console.log("->")
  		//console.log(D)
  		this.Socket.send(JSON.stringify(D) + "---Message--End---")
  		return Id
  	}

  	Async(Type,Data)
  	{
  		if(!this.Socket)
  			new Promise(function(resolve, reject) {
  				resolve(null)
			});
  		
  		let self = this
  		return new Promise(function(resolve, reject) {

  			let Id = self.Send(Type, Data, true)

			self.AsyncRequests[Id] = resolve
		});
  		
  	}

  	Init(Port)
  	{
  		let self = this
  		this.Socket = new WebSocket('ws://127.0.0.1:' + Port);
		this.Socket.addEventListener('close', function (event) {
			if(typeof(CloseApplication) == "function")
				CloseApplication()
			window.close();
		});
		this.Socket.addEventListener('message', function (event) {
			self.Buffer = self.Buffer + event.data
			let split = self.Buffer.split("---Message--End---")
			for(let i = 0;i<split.length - 1;i++)
			{
                let message = JSON.parse(split[i])
                
                if(message["type"] == "thread_start")
                {
                    self.CanSchedule = true;
                    var CopyList = self.ScheduledTasks;
                    self.ScheduledTasks = []
                    for(var it = 0;it < CopyList.length;it++)
                    {
                        var Schedule = CopyList[it]
                        Schedule.PromiseResolve(self.RunFunction(Schedule.FunctionName, Schedule.FunctionParams))
                    }
                }

				if(message["type"] == "browser_add")
				{
					Api.AddBrowser(message["data"]["browser_id"],message["data"]["task_id"])
				}
				
				if(message["type"] == "browser_remove")
				{
					Api.RemoveBrowser(message["data"]["browser_id"])
				}
				
				//console.log("<-")
				//console.log(message)
				if(message["type"] == "initialize")
				{
					self.ResourcesDefault = message["data"]["resources"]
					self.Database = message["data"]["database"]
					self.hasScheduler = false
					try
					{
						self.hasScheduler = message["data"]["has_scheduler"]
					}catch(e)
					{

					}
					var newDoc = document.open("text/html", "replace");
					newDoc.write(message["data"]["data"]);
					newDoc.close();
				}else if(message["type"] == "toggle_visibility")
				{
					try
					{
						if(typeof(ToggleVisibility) == "function")
							ToggleVisibility()
					}catch(e)
					{

					}
				}
				else if(message["type"] == "eval")
				{
					try
					{
						eval(message["data"]["script"])
					}catch(e){}

				}else if(message["type"] == "database_structure_changed")
				{
					self.Database = message["data"]["structure"]
					self.Callback(message["type"],message["data"])
				}else if(message["async"] && message["id"])
				{
					

					if(message["type"] == "get_global_variable")
					{
						var func = self.AsyncRequests[message["id"]];
						delete self.AsyncRequests[message["id"]];
						(func)(JSON.parse(message["data"]))
					}else if(self.AsyncRequests[message["id"]])
					{
						var func = self.AsyncRequests[message["id"]];
						delete self.AsyncRequests[message["id"]];
						(func)(message["data"])
					}
				}else
				{
					self.Callback(message["type"],message["data"])
				}
			}
			self.Buffer = split[split.length - 1]
		});
  	}

  	HasScheduler()
  	{
  		return this.hasScheduler
  	}

  	ShowScheduler()
  	{
  		this.Send("show_scheduler", {})
	}

	InstallScheduler()
  	{
  		this.Send("install_scheduler", {})
  	}

  	RunFunction(FunctionName, FunctionParams)
  	{
        var self = this

        if(!this.CanSchedule)
        {
            return new Promise(function(resolve, reject) {
                self.ScheduledTasks.push({FunctionName:FunctionName,FunctionParams:FunctionParams,PromiseResolve:resolve,PromiseReject:reject})
            })
        }
		var ThreadId = Math.floor(Math.random() * 1000000) + 1
		

  		var Res = new Promise(function(resolve, reject) {
    		self.Send("start_thread", {thread_id: ThreadId})
			self.AddTask(ThreadId, "function", null, FunctionName, FunctionParams)
			self.Async("run_task", {thread_id: ThreadId, function_name: FunctionName, params: JSON.stringify(FunctionParams)})
				.then(function(Result){
					self.RemoveTask(ThreadId)
					var ParsedResult = JSON.parse(Result)
	                if(ParsedResult.Success)
	                {
	                	resolve(ParsedResult.Result)
	                }else
	                {
						reject(ParsedResult.Message)
	                }
	                self.Send("stop_thread", {thread_id: ThreadId})
	            })
  		})

		var InjectPromise = function(CurrentPromise)
		{
			CurrentPromise.taskId = ThreadId
			CurrentPromise.stop = function()
			{
				Api.RemoveTask(ThreadId)
				self.Send("stop_thread", {thread_id: ThreadId})
			}
			CurrentPromise.get_id = function()
			{
				return ThreadId
			}
			var ThenOriginal = CurrentPromise.then
			var CatchOriginal = CurrentPromise.catch
			var FinallyOriginal = CurrentPromise.finally
			CurrentPromise.then = function()
			{
				var ThenRes = ThenOriginal.apply(CurrentPromise, arguments)
				InjectPromise(ThenRes)
				return ThenRes
			}

			CurrentPromise.catch = function()
			{
				var CatchRes = CatchOriginal.apply(CurrentPromise, arguments)
				InjectPromise(CatchRes)
				return CatchRes
			}

			CurrentPromise.finally = function()
			{
				var FinallyRes = FinallyOriginal.apply(CurrentPromise, arguments)
				InjectPromise(FinallyRes)
				return FinallyRes
			}

		}

		InjectPromise(Res)
		  
		self.Tasks[ThreadId].object = Res

  		return Res
  	}

  	AutoLoadResources()
  	{
  		let self = this
		Object.keys(self.ResourcesDefault).forEach(function(Resource){
			if(typeof(SetResourceValue) != "undefined")
				SetResourceValue(Resource, self.ResourcesDefault[Resource])
			else
				SetValue(Resource, self.ResourcesDefault[Resource])
		})
  	}

  	MessageAccepted()
  	{
  		this.Send("message_accept", {})
  	}

  	RunWithoutDatabase()
  	{
  		this.Send("run_without_database", {})
  	}

  	RunWithoutEmbeddedLanguage()
  	{
  		this.Send("run_without_embedded", {})
  	}

  	Login(Username, Password)
  	{
  		this.Send("login", {"username": Username,"password": Password})
  	}

  	SelectRunType(IsInstant)
  	{
  		this.Send("select_run_type", {"is_instant": IsInstant})
  	}

  	SetEventHandler(callback)
	{
		this.Callback = callback
		try
		{
			this.Send("initialized", {})
		}catch(e)
		{

		}
	}

	GetResourcesReport()
	{
		return this.Async("resources_report",{})
	}

	GetScriptReport()
	{
		return this.Async("script_report",{})
	}


	OpenFileDialog(Options)
	{
		return this.Async("open_file_dialog",Options)
	}

	SaveFileDialog(Options)
	{
		return this.Async("save_file_dialog",Options)
	}

	ViewBrowser(BrowserId)
	{
		return this.Async("view_browser",{browser_id:BrowserId})	
	}

	GetTabs(BrowserId)
	{
		return new Promise(function(resolve, reject) {
			
			Api.Async("get_tabs",{browser_id:BrowserId})
				.then(function(Result){
					resolve(JSON.parse(Result.json))
	        	})
  		})

		 	
	}

	ShowBrowser(BrowserId)
	{
		this.Send("show_browser", {"browser_id": BrowserId})
	}

	HideBrowser(BrowserId)
	{
		this.Send("hide_browser", {"browser_id": BrowserId})
	}

  	AcceptResources(EmptyScript)
	{

		let self = this
		let Data = {}
		Object.keys(self.ResourcesDefault).forEach(function(Resource){
			Data[Resource] = GetResourceValue(Resource)
		})

		if(typeof(EmptyScript) == "boolean" && EmptyScript)
		{
			Data["-bas-empty-script-"] = true
		}

		this.Send("accept_resources", Data)
	}

	Stop(IsInstant)
	{
		this.Send("stop",{"is_instant": IsInstant})
	}

	Restart()
	{
		this.Send("restart",{})
	}
}
