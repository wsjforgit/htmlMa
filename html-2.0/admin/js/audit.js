$(function(){
    $("[data-agree]").on("click",function(){
        if(!$('[type="checkbox"]').is(':checked')){
            $.alerts('danger','没有选择！',0);
        }else{
            var arr =[];
            $('[type="checkbox"]:checked').each(function(i){
                arr[i] = $(this).val();
            })
            $.alerts('success','审核通过',1000);
        }
    })
    $("[data-disagree]").on("click",function(){
        if(!$('[type="checkbox"]').is(':checked')){
            $.alerts('danger','没有选择！',0);
        }else{
            $.alerts('danger','',1);
            var arr =[];
            $('[type="checkbox"]:checked').each(function(i){
                arr[i] = $(this).val();
            })
            $("#mymodal input.hidden").val(arr.join(','));
            $("#mymodal").modal('show');
        }
    })
})