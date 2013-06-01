def trim(s):
    """
    Removes partial unicode characters from the end of the string
    So, "34\u2345\u3456" remains untouched
        "34\u2345\u3456\u45" its last \u and later characters removed
        "34\u2345\u3456\" would have its last backslash removed
        Edge case: Empty string, which obviously would be returned as it is
    """
    
    if s == "":
        return s
    
    if (s[-1] == "\\"):   # Need to escape backslashes
        # Just the last character needs to be removed
        return s[:-1]
                    
    else:
        # Search for "\u" in the last five characters
        # If found, return everything before that
        # Otherwise, just return the whole string unchanged
        loc = s.rfind("\u", -5)

        if (loc != -1):
            return s[:loc]
        else:
            return s


def isTrimmed(s):
    """
    A string is "trimmed" if there's no partial unicode encoding at the end.

    \u9000 is good, but a\u900 is not, and neither are asdf\u or asdfg\
    654321              654321                         654321    654321
    
    So, we return True if the string is empty, or if both these are true:
    i)   There is no instance of \u in the last five characters
    ii)  The last character is not a \
    """

    if (s == ""):
        return True

    else:
        condition1 = (s.rfind("\u", -5) == -1)
        condition2 = (s[-1] != "\\")

        return condition1 and condition2


