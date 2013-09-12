/*global describe it before after  =*/

require(["lib/architect/architect", "lib/chai/chai", "/vfs-root"], 
  function (architect, chai, baseProc) {
    var expect = chai.expect;
    
    architect.resolveConfig([
        {
            packagePath : "plugins/c9.core/c9",
            workspaceId : "ubuntu/ip-10-35-77-180",
            startdate   : new Date(),
            debug       : true,
            smithIo     : "{\"prefix\":\"/smith.io/server\"}",
            hosted      : true,
            local       : false,
            hostname    : "dev.javruben.c9.io",
            davPrefix   : "/"
        },
        
        "plugins/c9.core/ext",
        "plugins/c9.core/events",
        "plugins/c9.core/http",
        "plugins/c9.core/util",
        "plugins/c9.ide.ui/lib_apf",
        "plugins/c9.ide.ui/anims",
        {
            packagePath : "plugins/c9.core/settings",
            settings : "<settings><state><console>" + JSON.stringify({
                type  : "pane", 
                nodes : [
                    {
                        type : "tab",
                        editorType : "output",
                        active : "true",
                        document : {
                            title  : "Build",
                            output : {
                                id : "build"
                            }
                        }
                    }
                ]
            }) + "</console></state></settings>"
        },
        {
            packagePath  : "plugins/c9.ide.ui/ui",
            staticPrefix : "plugins/c9.ide.ui"
        },
        "plugins/c9.ide.editors/document",
        "plugins/c9.ide.editors/undomanager",
        "plugins/c9.ide.editors/editors",
        "plugins/c9.ide.editors/editor",
        {
            packagePath : "plugins/c9.ide.editors/tabmanager",
            testing     : 2
        },
        "plugins/c9.ide.editors/pane",
        "plugins/c9.ide.editors/tab",
        "plugins/c9.ide.terminal/terminal",
        "plugins/c9.ide.run/output",
        "plugins/c9.ide.console/console",
        "plugins/c9.fs/proc",
        "plugins/c9.fs/fs",
        {
            packagePath: "plugins/c9.vfs.client/vfs_client",
            smithIo     : {
                "prefix": "/smith.io/server"
            }
        },
        "plugins/c9.ide.auth/auth",
        {
            packagePath : "plugins/c9.ide.run/run",
            testing     : true,
            base        : baseProc,
            runners     : {
                "node" : {
                    "caption" : "Node.js (current)",
                    "cmd": ["node", "${debug?--debug-brk=15454}", "$file"],
                    "debugger": "v8",
                    "debugport": 15454,
                    "file_regex": "^[ ]*File \"(...*?)\", line ([0-9]*)",
                    "selector": "source.js",
                    "info": "Your code is running at \\033[01;34m$hostname\\033[00m.\n"
                        + "\\033[01;31mImportant:\\033[00m use \\033[01;32mprocess.env.PORT\\033[00m as the port and \\033[01;32mprocess.env.IP\\033[00m as the host in your scripts!\n"
                },
                "coffee" : {
                    "caption" : "Coffee",
                    "cmd": ["coffee", "$file"],
                    "debug": ["--debug-brk=5454"],
                    "file_regex": "^[ ]*File \"(...*?)\", line ([0-9]*)",
                    "selector": "source.coffee",
                    "info": "Your code is running at \\033[01;34m$hostname\\033[00m.\n"
                        + "\\033[01;31mImportant:\\033[00m use \\033[01;32mprocess.env.PORT\\033[00m as the port and \\033[01;32mprocess.env.IP\\033[00m as the host in your scripts!\n"
                },
                "pythoni" : {
                    "caption" : "Python in interactive mode",
                    "cmd": ["python", "-i"],
                    "selector": "source.python",
                    "info": "Hit \\033[01;34mCtrl-D\\033[00m to exit.\n"
                },
                "typescript" : {
                    "caption" : "Typescript",
                    "cmd": ["tsc", "-e", "$file"],
                    "selector": "source.ts",
                    "info": "Your code is running at \\033[01;34m$hostname\\033[00m.\n"
                        + "\\033[01;31mImportant:\\033[00m use \\033[01;32mprocess.env.PORT\\033[00m as the port and \\033[01;32mprocess.env.IP\\033[00m as the host in your scripts!\n"
                }
            }
        },
        {
            packagePath : "plugins/c9.ide.run.build/build",
            base        : baseProc,
            builders    : {
                "coffee" : {
                    "caption" : "Coffee",
                    "cmd": ["coffee", "-c", "$file"],
                    "selector": "source.coffee",
                },
                "scss" : {
                    "caption" : "SASS (scss)",
                    "cmd": ["sass", "${debug?--debug-info}", "--scss", "--update", "$file:${file/\\.scss/\\.css/}"],
                    "selector": "source.scss"
                },
                "less" : {
                    "caption" : "LESS",
                    "cmd": ["lessc", "$file", ">", "${file/\\.less/\\.css/}"],
                    "selector": "source.less"
                },
                "typescript" : {
                    "caption" : "Typescript",
                    "cmd": ["tsc", "--out", "${file/\\.ts/\\.js/}", "$file"],
                    "selector": "source.ts"
                }
            }
        },
        {
            packagePath : "plugins/c9.ide.run.build/gui"
        },
        
        // Mock plugins
        {
            consumes : ["emitter", "apf", "ui"],
            provides : [
                "commands", "menus", "layout", "watcher", 
                "save", "fs", "preferences", "clipboard"
            ],
            setup    : expect.html.mocked
        },
        {
            consumes : ["build", "run", "fs", "tabManager", "console", "output", "save"],
            provides : [],
            setup    : main
        }
    ], function (err, config) {
        if (err) throw err;
        var app = architect.createApp(config);
        app.on("service", function(name, plugin){ plugin.name = name; });
    });
    
    function main(options, imports, register) {
        var run      = imports.run;
        var build    = imports.build;
        var fs       = imports.fs;
        var tabs     = imports.tabManager;
        var save     = imports.save;
        var cnsl     = imports.console;
        
        expect.html.setConstructor(function(tab){
            if (typeof tab == "object")
                return tab.pane.aml.getPage("editor::" + tab.editorType).$ext;
        });
        
        function countEvents(count, expected, done){
            if (count == expected) 
                done();
            else
                throw new Error("Wrong Event Count: "
                    + count + " of " + expected);
        }
        
        describe('build gui', function() {
            before(function(done){
                apf.config.setProperty("allow-select", false);
                apf.config.setProperty("allow-blur", false);

                bar.$ext.style.background = "rgba(220, 220, 220, 0.93)";
                bar.$ext.style.position = "fixed";
                bar.$ext.style.left = "20px";
                bar.$ext.style.right = "20px";
                bar.$ext.style.bottom = "20px";
                bar.$ext.style.height = "150px";
      
                document.body.style.marginBottom = "150px";
                done();
            });
            
            this.timeout(10000);
            
            it('should build a file automatically based on a selector', function(done) {
                build.getBuilder("coffee", false, function(err, builder){
                    if (err) throw err.message;
                    
                    expect(builder).to.ok;
                    
                    builder.selector = "source.coffee";
                    
                    var c = "console.log 'Hello Coffee'";
                    
                    fs.rmfile("/helloworld.js", function(){
                        fs.writeFile("/helloworld.coffee", c, "utf8", function(err){
                            if (err) throw err.message;
                        });
                        
                        save.emit("afterSave", {path: "/helloworld.coffee"});
                        
                        build.on("stopped", function c1(e){
                            var process = e.process;
                            
                            expect(process.running).is.equal(run.STOPPED);
                            build.off("stopped", c1);
                            
                            fs.readFile("/helloworld.js", "utf8", function(err, data){
                                expect(data).to.match(/console.log\('Hello Coffee'\)/);
                                
                                fs.rmfile("/helloworld.js", function(){
                                    fs.rmfile("/helloworld.coffee", function(){
                                        delete builder.selector;
                                        done();
                                    });
                                });
                            });
                        });
                    });
                });
            });
            
            if (!onload.remain){
               after(function(done){
                    run.unload();
                    build.unload();
                    tabs.unload();
                    cnsl.unload();
                   
                   document.body.style.marginBottom = "";
                   done();
               });
            }
        });
        
        onload && onload();
    }
});