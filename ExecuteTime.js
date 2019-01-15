define([
    'require',
    'jquery',
    'moment',
    'base/js/namespace',
    'base/js/events',
    'notebook/js/codecell'
], function (
    requirejs,
    $,
    moment,
    Jupyter,
    events,
    codecell
) {
    'use strict';
    var mod_name = 'ExecuteTime';
    var log_prefix = '[' + mod_name + ']';
    var CodeCell = codecell.CodeCell;
    var blink=0;

    function patch_CodeCell_get_callbacks () {
        console.log(log_prefix, 'patching CodeCell.prototype.get_callbacks');
        var old_get_callbacks = CodeCell.prototype.get_callbacks;
        CodeCell.prototype.get_callbacks = function () {
            var callbacks = old_get_callbacks.apply(this, arguments);

            var cell = this;
            var prev_reply_callback = callbacks.shell.reply;
            callbacks.shell.reply = function (msg) {
                if (msg.msg_type === 'execute_reply') {
                    setTimeout( function(){
                        if ($.ui !== undefined) {
                            var input_area = cell.element.find('.input_area')
                            var color;
                            
                            blink=0;
                            if((cell.output_area.outputs === undefined ||
                                 cell.output_area.outputs.length == 0) ||
                                  cell.output_area.outputs[0].output_type != 'error') color = '#00bb00'
                            else color = '#cc0000'

                            input_area.stop(true,true);
                            input_area[0].style.opacity = 1;
                            input_area[0].style.backgroundColor = "#ffffff";            
                            input_area.show(0).effect('highlight', {color: color});                            
                        }
                      }, 5 );
                }

                return prev_reply_callback(msg);
            };
            return callbacks;
        };
    }

    function excute_codecell_callback (evt, data) {
        var cell = data.cell;
        blink=1;
        var input_area = cell.element.find('.input_area')            
        function initpulse(){
            input_area.fadeTo(1480, 0.03,after1)
        }
        function after1(){
            if(blink == 1){
                input_area[0].style.backgroundColor = "#42A5F5";
                pulsatingIn();
            }
        }
        function pulsatingOut(){
            if(blink ==1) input_area.fadeTo(1400, 0.1, pulsatingIn);
        }
        function pulsatingIn(){
            if(blink ==1) input_area.fadeTo(2500, 1, pulsatingOut);
        }
        
        initpulse();

    }

    function load_jupyter_extension () {
        // try to load jquery-ui
        if ($.ui === undefined) {
            requirejs(['jquery-ui'], function ($) {}, function (err) {
                // try to load using the older, non-standard name (without hyphen)
                requirejs(['jqueryui'], function ($) {}, function (err) {
                    console.log(log_prefix, 'couldn\'t find jquery-ui, so no animations');
                });
            });
        }

        Jupyter.notebook.config.loaded.then(function () {

            patch_CodeCell_get_callbacks();
            events.on('execute.CodeCell', excute_codecell_callback);

        }).catch(function on_error (reason) {
            console.error(log_prefix, 'Error:', reason);
        });
    }

    return {
        load_jupyter_extension : load_jupyter_extension,
        load_ipython_extension : load_jupyter_extension
    };
});
