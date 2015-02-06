define(['dispatcher'], function(AppDispatcher){
    return {
        openItem: function(item){
            AppDispatcher.dispatch({
                type: 'OPEN_ITEM',
                item: item,
            });
        },

        closeItem: function(){
            AppDispatcher.dispatch({
                type: 'CLOSE_ITEM'
            });
        },
    };
});
